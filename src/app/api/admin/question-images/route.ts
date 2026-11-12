import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminAuditLogs, tryoutPackages } from "@/db/database/schema";
import { requireAdminAccess } from "@/lib/authz";
import { createAdminAuditEntry } from "@/lib/security/admin-audit";
import { consumeAccountRateLimit } from "@/lib/security/rate-limit";
import { isTrustedRequestOrigin } from "@/lib/security/request-origin";
import {
  InvalidQuestionImageError,
  QuestionImageStorageConfigurationError,
  storeQuestionImage,
} from "@/lib/question-image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_SIZE = 4 * 1024 * 1024 + 64 * 1024;

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Permintaan unggah tidak diizinkan." }, { status: 403 });
  }

  let actor: Awaited<ReturnType<typeof requireAdminAccess>>;
  try {
    actor = await requireAdminAccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: "Anda tidak berwenang mengunggah gambar." }, { status });
  }

  const rateLimit = await consumeAccountRateLimit({
    namespace: "question-image-upload",
    headers: request.headers,
    identifier: actor.id,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimit.storageUnavailable) {
    return NextResponse.json({ error: "Layanan unggah sedang tidak tersedia. Coba lagi sebentar." }, { status: 503, headers: { "Retry-After": "60" } });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Batas unggah sementara tercapai. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  const rawContentLength = request.headers.get("content-length");
  if (rawContentLength !== null) {
    const contentLength = Number(rawContentLength);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return NextResponse.json({ error: "Ukuran permintaan tidak valid." }, { status: 400 });
    }
    if (contentLength > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: "Ukuran gambar maksimal 4 MB." }, { status: 413 });
    }
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return NextResponse.json({ error: "Format permintaan unggah tidak valid." }, { status: 400 });
  }

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Isi formulir unggah tidak dapat dibaca." }, { status: 400 });
    }
    const file = formData.get("file");
    const packageId = Number(formData.get("packageId"));

    if (!(file instanceof File) || !Number.isInteger(packageId) || packageId < 1) {
      return NextResponse.json({ error: "File atau paket tidak valid." }, { status: 400 });
    }

    const [packageRecord] = await db
      .select({ id: tryoutPackages.id })
      .from(tryoutPackages)
      .where(eq(tryoutPackages.id, packageId))
      .limit(1);

    if (!packageRecord) {
      return NextResponse.json({ error: "Paket tryout tidak ditemukan." }, { status: 404 });
    }

    const result = await storeQuestionImage(packageId, file);
    try {
      await db.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
        action: "question-image.uploaded",
        targetType: "package",
        targetId: String(packageId),
        metadata: { packageId, contentType: result.contentType },
      }));
    } catch (auditError) {
      console.error("[Question image audit error] Gambar tersimpan tetapi catatan audit gagal ditulis:", auditError);
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = error instanceof InvalidQuestionImageError
      ? 400
      : error instanceof QuestionImageStorageConfigurationError
        ? 503
        : 500;

    if (status === 500) {
      console.error("[Question image upload error]", error);
    }

    return NextResponse.json({
      error: status === 500 ? "Gambar gagal diunggah. Coba lagi sebentar." : message,
    }, { status });
  }
}
