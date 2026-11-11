import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userAccess, users } from "@/db/database/schema";
import { isQuestionImageNotFound, readQuestionImage } from "@/lib/question-image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QuestionImageRouteProps {
  params: Promise<{ packageId: string; filename: string }>;
}

export async function GET(_request: Request, { params }: QuestionImageRouteProps) {
  const [{ packageId: rawPackageId, filename }, session] = await Promise.all([params, auth()]);
  const packageId = Number(rawPackageId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (
    !Number.isInteger(packageId) ||
    packageId < 1 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/i.test(filename)
  ) {
    return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user?.role !== "ADMIN") {
    const [access] = await db
      .select({ id: userAccess.id })
      .from(userAccess)
      .where(and(
        eq(userAccess.userId, session.user.id),
        eq(userAccess.packageId, packageId),
      ))
      .limit(1);

    if (!access) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  try {
    const image = await readQuestionImage(packageId, filename);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.bytes.byteLength),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (isQuestionImageNotFound(error)) {
      return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
    }

    console.error("[Question image read error]", error);
    return NextResponse.json({ error: "Gambar sementara tidak dapat dimuat." }, { status: 503 });
  }
}
