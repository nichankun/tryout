import { and, asc, desc, eq, gte, lt, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orders, userAccess } from "@/db/database/schema";
import {
  applyMidtransStatus,
  cancelMidtransSnapSession,
  cancelMidtransTransaction,
  getMidtransTransactionStatus,
  markPendingOrderFailed,
  matchesPaymentOrder,
  resolveMidtransStatus,
} from "@/lib/payments/midtrans";
import type { LocalPaymentStatus, PendingPaymentOrder } from "@/lib/payments/midtrans";

const SNAP_SESSION_LIFETIME_MS = 60 * 60 * 1000;
const SNAP_EXPIRY_GRACE_MS = 5 * 60 * 1000;
export const PAYMENT_ORDER_RECOVERY_WINDOW_MS = SNAP_SESSION_LIFETIME_MS + SNAP_EXPIRY_GRACE_MS;
const MIN_PENDING_AGE_MS = 60 * 1000;
const MAX_ORDERS_PER_RUN = 20;
const MAX_CONCURRENT_MIDTRANS_REQUESTS = 4;

export interface PendingOrderReconciliation {
  status: LocalPaymentStatus;
  closed: boolean;
}

interface MidtransSyncResult {
  providerStatus: LocalPaymentStatus;
  localStatus: LocalPaymentStatus;
}

function orderAgeMs(order: PendingPaymentOrder) {
  return Date.now() - (order.createdAt?.getTime() ?? 0);
}

async function readAndApplyMidtransStatus(order: PendingPaymentOrder): Promise<MidtransSyncResult | null> {
  const remoteStatus = await getMidtransTransactionStatus(order.id);
  if (!remoteStatus) return null;
  if (!matchesPaymentOrder(order, remoteStatus)) {
    throw new Error("Midtrans transaction status did not match the local order.");
  }
  const providerStatus = resolveMidtransStatus(
    remoteStatus.transaction_status,
    remoteStatus.fraud_status,
    remoteStatus.status_code,
  );
  const localStatus = await applyMidtransStatus(order, remoteStatus);
  return { providerStatus, localStatus };
}

async function closeUnstartedSnapSession(order: PendingPaymentOrder): Promise<PendingOrderReconciliation> {
  if (!order.snapToken) {
    if (orderAgeMs(order) >= SNAP_SESSION_LIFETIME_MS + SNAP_EXPIRY_GRACE_MS) {
      await markPendingOrderFailed(order.id);
      return { status: "failed", closed: true };
    }
    return { status: "pending", closed: false };
  }

  const cancellation = await cancelMidtransSnapSession(order.snapToken);
  if (cancellation === "closed") {
    await markPendingOrderFailed(order.id);
    return { status: "failed", closed: true };
  }

  const currentStatus = await readAndApplyMidtransStatus(order);
  if (currentStatus && currentStatus.providerStatus !== "pending") {
    return {
      status: currentStatus.localStatus,
      closed: currentStatus.providerStatus !== "unknown",
    };
  }
  return { status: "pending", closed: false };
}

export async function reconcilePendingOrder(
  order: PendingPaymentOrder,
  options: { cancelIfStillPending?: boolean } = {},
): Promise<PendingOrderReconciliation> {
  const ageMs = orderAgeMs(order);
  const remoteStatus = await readAndApplyMidtransStatus(order);

  if (remoteStatus && remoteStatus.providerStatus !== "pending") {
    return {
      status: remoteStatus.localStatus,
      closed: remoteStatus.providerStatus !== "unknown",
    };
  }

  const shouldClose = options.cancelIfStillPending === true
    || ageMs >= SNAP_SESSION_LIFETIME_MS + SNAP_EXPIRY_GRACE_MS;

  if (remoteStatus?.providerStatus === "pending" && shouldClose) {
    try {
      await cancelMidtransTransaction(order.id);
    } catch {
      // A payment can complete between status lookup and cancellation; reconcile again before acting locally.
    }
    const afterCancel = await readAndApplyMidtransStatus(order);
    if (afterCancel && afterCancel.providerStatus !== "pending") {
      return {
        status: afterCancel.localStatus,
        closed: afterCancel.providerStatus !== "unknown",
      };
    }
    if (afterCancel?.providerStatus === "pending") {
      return { status: afterCancel.localStatus, closed: false };
    }
    return closeUnstartedSnapSession(order);
  }

  if (remoteStatus === null && shouldClose) {
    return closeUnstartedSnapSession(order);
  }

  return { status: remoteStatus?.localStatus ?? "pending", closed: false };
}

async function hasNewerPendingOrder(order: PendingPaymentOrder) {
  const [latestPending] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(
      eq(orders.userId, order.userId),
      eq(orders.packageId, order.packageId),
      eq(orders.status, "pending"),
    ))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return Boolean(latestPending && latestPending.id !== order.id);
}

export async function reconcilePendingPayments() {
  const cutoff = new Date(Date.now() - MIN_PENDING_AGE_MS);
  const failedOrderCutoff = new Date(Date.now() - PAYMENT_ORDER_RECOVERY_WINDOW_MS);
  const candidates = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      packageId: orders.packageId,
      amount: orders.amount,
      snapToken: orders.snapToken,
      createdAt: orders.createdAt,
      status: orders.status,
      reconciliationRequired: orders.reconciliationRequired,
    })
    .from(orders)
    .where(and(
      or(
        eq(orders.status, "pending"),
        and(
          eq(orders.status, "failed"),
          or(
            eq(orders.reconciliationRequired, true),
            isNull(orders.createdAt),
            gte(orders.createdAt, failedOrderCutoff),
          ),
        ),
      ),
      or(isNull(orders.createdAt), lt(orders.createdAt, cutoff)),
    ))
    .orderBy(asc(orders.createdAt))
    .limit(MAX_ORDERS_PER_RUN);

  const summary = {
    checked: candidates.length,
    paid: 0,
    failed: 0,
    refunded: 0,
    disputed: 0,
    duplicateOrdersClosed: 0,
    pending: 0,
    errors: 0,
  };

  let nextCandidate = 0;
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT_MIDTRANS_REQUESTS, candidates.length) },
    async () => {
      while (nextCandidate < candidates.length) {
        const candidate = candidates[nextCandidate];
        nextCandidate += 1;
        const order: PendingPaymentOrder = candidate;

        try {
          const [access, newerPending] = await Promise.all([
            db.query.userAccess.findFirst({
              where: and(
                eq(userAccess.userId, order.userId),
                eq(userAccess.packageId, order.packageId),
              ),
              columns: { id: true },
            }),
            hasNewerPendingOrder(order),
          ]);

          const result = await reconcilePendingOrder(order, {
            cancelIfStillPending: Boolean(access || newerPending || candidate.status === "failed"),
          });
          if (result.status === "paid") summary.paid += 1;
          else if (result.status === "failed" && result.closed) summary.failed += 1;
          else if (result.status === "refunded" || result.status === "partially_refunded") summary.refunded += 1;
          else if (result.status === "disputed") summary.disputed += 1;
          else summary.pending += 1;
          if ((access || newerPending) && result.closed) summary.duplicateOrdersClosed += 1;
        } catch (error) {
          summary.errors += 1;
          console.error(
            `[Payments Reconciliation] Order ${order.id} could not be reconciled:`,
            error instanceof Error ? error.name : "UnknownError",
          );
        }
      }
    },
  );

  await Promise.all(workers);
  return summary;
}
