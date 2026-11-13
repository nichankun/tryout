import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, userAccess } from "@/db/database/schema";

const MIDTRANS_REQUEST_TIMEOUT_MS = 8_000;

function getServerKey() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not configured.");
  return serverKey;
}

function getMidtransCoreBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function getMidtransSnapBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

export function getMidtransExpiryStartTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} +0700`;
}

function getBasicAuthorization() {
  return `Basic ${Buffer.from(`${getServerKey()}:`, "utf8").toString("base64")}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    return null;
  }
}

export const MidtransTransactionStatusSchema = z.object({
  order_id: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().optional().nullable(),
  payment_type: z.string().optional().nullable(),
  fraud_status: z.string().optional().nullable(),
  gross_amount: z.union([z.string(), z.number()]).transform(String),
  currency: z.string().min(1),
  refund_amount: z.union([z.string(), z.number()]).optional().nullable().transform((value) =>
    value == null ? undefined : String(value),
  ),
  status_code: z.string().optional(),
  signature_key: z.string().optional(),
});

export const MidtransNotificationSchema = MidtransTransactionStatusSchema.extend({
  status_code: z.string().min(1),
  signature_key: z.string().min(1),
});

export type MidtransTransactionStatus = z.infer<typeof MidtransTransactionStatusSchema>;
export type MidtransNotification = z.infer<typeof MidtransNotificationSchema>;
export type LocalPaymentStatus = "paid" | "partially_refunded" | "refunded" | "disputed" | "pending" | "failed" | "unknown";

export interface PaymentOrderIdentity {
  id: string;
  userId: string;
  packageId: number;
  amount: number;
}

export interface PendingPaymentOrder extends PaymentOrderIdentity {
  snapToken: string | null;
  createdAt: Date | null;
}

export function resolveMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string | null,
  statusCode?: string,
): LocalPaymentStatus {
  if (transactionStatus === "capture") {
    if (statusCode !== undefined && statusCode !== "200") return "unknown";
    if (!fraudStatus || fraudStatus === "accept") return "paid";
    if (fraudStatus === "deny") return "failed";
    return "unknown";
  }
  if (transactionStatus === "settlement") {
    return statusCode === undefined || statusCode === "200" ? "paid" : "unknown";
  }
  if (transactionStatus === "pending") return "pending";
  if (transactionStatus === "partial_refund") return "partially_refunded";
  if (transactionStatus === "refund") return "refunded";
  if (["chargeback", "partial_chargeback"].includes(transactionStatus)) return "disputed";
  if (["deny", "cancel", "expire", "failure"].includes(transactionStatus)) return "failed";
  return "unknown";
}

export function matchesPaymentOrder(
  order: PaymentOrderIdentity,
  status: MidtransTransactionStatus,
): boolean {
  const notifiedAmount = Number(status.gross_amount);
  return status.order_id === order.id
    && status.currency === "IDR"
    && Number.isSafeInteger(notifiedAmount)
    && notifiedAmount === order.amount;
}

export function verifyMidtransNotification(payload: unknown): MidtransNotification | null {
  const parsed = MidtransNotificationSchema.safeParse(payload);
  if (!parsed.success) return null;

  const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: signature } = parsed.data;
  if (!/^[a-f0-9]{128}$/i.test(signature)) return null;

  const expected = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${getServerKey()}`, "utf8")
    .digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return parsed.data;
}

export async function createMidtransSnapToken(parameter: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${getMidtransSnapBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthorization(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parameter),
    cache: "no-store",
    signal: AbortSignal.timeout(MIDTRANS_REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(`Midtrans Snap request failed (${response.status}).`);
  const parsed = z.object({ token: z.string().min(1) }).safeParse(payload);
  if (!parsed.success) throw new Error("Midtrans Snap response did not contain a valid token.");
  return parsed.data.token;
}

export async function getMidtransTransactionStatus(orderId: string): Promise<MidtransTransactionStatus | null> {
  const response = await fetch(`${getMidtransCoreBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: getBasicAuthorization(), Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(MIDTRANS_REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson(response);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Midtrans status request failed (${response.status}).`);

  const responseCode = typeof payload === "object" && payload !== null && "status_code" in payload
    ? String(payload.status_code)
    : undefined;
  if (responseCode === "404" || responseCode === "407") return null;

  const parsed = MidtransTransactionStatusSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Midtrans returned an invalid transaction status response.");
  return parsed.data;
}

export async function cancelMidtransTransaction(orderId: string): Promise<void> {
  const response = await fetch(`${getMidtransCoreBaseUrl()}/v2/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: { Authorization: getBasicAuthorization(), Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(MIDTRANS_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Midtrans transaction cancellation failed (${response.status}).`);
  }
}

export type SnapSessionCancellation = "closed" | "in_progress";

export async function cancelMidtransSnapSession(token: string): Promise<SnapSessionCancellation> {
  const response = await fetch(`${getMidtransSnapBaseUrl()}/transactions/${encodeURIComponent(token)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: getServerKey(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(MIDTRANS_REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson(response);
  if (response.ok) return "closed";

  const messages = typeof payload === "object" && payload !== null && "error_messages" in payload
    && Array.isArray(payload.error_messages)
    ? payload.error_messages.filter((message): message is string => typeof message === "string")
    : [];
  const normalized = messages.join(" ").toLowerCase();
  if (normalized.includes("already canceled") || normalized.includes("token not found")) return "closed";
  if (normalized.includes("transaction is on progress") || normalized.includes("transaction in progress")) return "in_progress";
  throw new Error(`Midtrans Snap session cancellation failed (${response.status}).`);
}

function parseRefundAmount(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? Math.min(amount, fallback) : fallback;
}

export async function markPendingOrderFailed(orderId: string): Promise<void> {
  await db
    .update(orders)
    .set({ status: "failed", reconciliationRequired: false })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["pending", "failed"])));
}

export async function applyMidtransStatus(
  order: PaymentOrderIdentity,
  status: MidtransTransactionStatus,
): Promise<LocalPaymentStatus> {
  const resolvedStatus = resolveMidtransStatus(status.transaction_status, status.fraud_status, status.status_code);
  if (resolvedStatus === "unknown") return resolvedStatus;

  let finalStatus: LocalPaymentStatus = resolvedStatus;
  await db.transaction(async (tx) => {
    const lockKey = `${order.userId}:${order.packageId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

    const [currentOrder] = await tx
      .select({
        status: orders.status,
        paidAt: orders.paidAt,
        transactionId: orders.transactionId,
        paymentMethod: orders.paymentMethod,
        refundAmount: orders.refundAmount,
        reconciliationRequired: orders.reconciliationRequired,
      })
      .from(orders)
      .where(eq(orders.id, order.id))
      .limit(1);
    if (!currentOrder) return;

    const paymentMetadata = {
      transactionId: status.transaction_id ?? currentOrder.transactionId,
      paymentMethod: status.payment_type ?? currentOrder.paymentMethod,
    };

    if (resolvedStatus === "paid") {
      if (["partially_refunded", "refunded", "disputed"].includes(currentOrder.status)) {
        finalStatus = currentOrder.status;
        return;
      }

      const [otherPaidOrder] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(
          eq(orders.userId, order.userId),
          eq(orders.packageId, order.packageId),
          ne(orders.id, order.id),
          inArray(orders.status, ["paid", "partially_refunded"]),
        ))
        .limit(1);

      if (otherPaidOrder) {
        await tx.update(orders).set({ duplicatePayment: true }).where(eq(orders.id, otherPaidOrder.id));
        await tx.update(orders).set({ duplicatePayment: true }).where(eq(orders.id, order.id));
        console.error(`[Midtrans] Duplicate successful payment detected for orders ${otherPaidOrder.id} and ${order.id}.`);
      }

      if (currentOrder.status !== "paid") {
        await tx
          .update(orders)
          .set({
            ...paymentMetadata,
            status: "paid",
            paidAt: currentOrder.paidAt ?? new Date(),
            reconciliationRequired: false,
          })
          .where(and(eq(orders.id, order.id), inArray(orders.status, ["pending", "failed"])));
      } else if (currentOrder.reconciliationRequired) {
        await tx.update(orders).set({ reconciliationRequired: false }).where(eq(orders.id, order.id));
      }
      await tx
        .insert(userAccess)
        .values({ userId: order.userId, packageId: order.packageId, purchasedAt: new Date() })
        .onConflictDoNothing();
      finalStatus = "paid";
      return;
    }

    if (resolvedStatus === "pending") {
      if (currentOrder.status === "pending") {
        await tx.update(orders).set(paymentMetadata).where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
      } else if (currentOrder.status === "failed" && !currentOrder.reconciliationRequired) {
        await tx
          .update(orders)
          .set({ ...paymentMetadata, reconciliationRequired: true })
          .where(and(eq(orders.id, order.id), eq(orders.status, "failed")));
      }
      finalStatus = currentOrder.status;
      return;
    }

    if (resolvedStatus === "partially_refunded") {
      if (["pending", "failed", "paid", "partially_refunded"].includes(currentOrder.status)) {
        await tx
          .update(orders)
          .set({
            ...paymentMetadata,
            status: "partially_refunded",
            refundAmount: parseRefundAmount(status.refund_amount, currentOrder.refundAmount),
            reconciliationRequired: false,
            paidAt: currentOrder.paidAt ?? new Date(),
          })
          .where(eq(orders.id, order.id));
        await tx
          .insert(userAccess)
          .values({ userId: order.userId, packageId: order.packageId, purchasedAt: currentOrder.paidAt ?? new Date() })
          .onConflictDoNothing();
        finalStatus = "partially_refunded";
      } else {
        finalStatus = currentOrder.status;
      }
      return;
    }

    if (resolvedStatus === "refunded") {
      if (["pending", "failed", "paid", "partially_refunded", "refunded", "disputed"].includes(currentOrder.status)) {
        await tx
          .update(orders)
          .set({
            ...paymentMetadata,
            status: "refunded",
            refundAmount: parseRefundAmount(status.refund_amount, order.amount),
            reconciliationRequired: false,
          })
          .where(eq(orders.id, order.id));
        const [otherPaidOrder] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(
            eq(orders.userId, order.userId),
            eq(orders.packageId, order.packageId),
            ne(orders.id, order.id),
            inArray(orders.status, ["paid", "partially_refunded"]),
          ))
          .limit(1);
        if (!otherPaidOrder) {
          await tx
            .delete(userAccess)
            .where(and(eq(userAccess.userId, order.userId), eq(userAccess.packageId, order.packageId)));
        }
        finalStatus = "refunded";
      } else {
        finalStatus = currentOrder.status;
      }
      return;
    }

    if (resolvedStatus === "disputed") {
      await tx
        .update(orders)
        .set({ ...paymentMetadata, status: "disputed", reconciliationRequired: false })
        .where(eq(orders.id, order.id));
      const [otherPaidOrder] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(
          eq(orders.userId, order.userId),
          eq(orders.packageId, order.packageId),
          ne(orders.id, order.id),
          inArray(orders.status, ["paid", "partially_refunded"]),
        ))
        .limit(1);
      if (!otherPaidOrder) {
        await tx
          .delete(userAccess)
          .where(and(eq(userAccess.userId, order.userId), eq(userAccess.packageId, order.packageId)));
      }
      finalStatus = "disputed";
      return;
    }

    if (resolvedStatus === "failed") {
      // A delayed deny/expire notification must never downgrade a paid order.
      // All currently enabled methods settle from pending; captured card flows are not enabled.
      if (currentOrder.status === "pending" || currentOrder.status === "failed") {
        await tx
          .update(orders)
          .set({ ...paymentMetadata, status: "failed", reconciliationRequired: false })
          .where(and(eq(orders.id, order.id), inArray(orders.status, ["pending", "failed"])));
        finalStatus = "failed";
      } else {
        finalStatus = currentOrder.status;
      }
    }
  });

  return finalStatus;
}
