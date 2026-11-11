import "dotenv/config";
import { z } from "zod";

const issues: string[] = [];
const env = process.env;

function requireValue(key: string) {
  const value = env[key]?.trim();
  if (!value) issues.push(`${key} belum diisi.`);
  return value ?? "";
}

function requireHttpsUrl(key: string) {
  const value = requireValue(key);
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      issues.push(`${key} harus berupa URL HTTPS tanpa credential.`);
      return null;
    }
    return url;
  } catch {
    issues.push(`${key} bukan URL yang valid.`);
    return null;
  }
}

const databaseUrl = requireValue("DATABASE_URL");
if (databaseUrl && !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  issues.push("DATABASE_URL harus menggunakan PostgreSQL.");
}

const authSecret = env.BETTER_AUTH_SECRET?.trim() || env.AUTH_SECRET?.trim() || "";
if (!authSecret) {
  issues.push("BETTER_AUTH_SECRET belum diisi (AUTH_SECRET lama masih didukung sementara).");
} else if (Buffer.byteLength(authSecret, "utf8") < 32) {
  issues.push("BETTER_AUTH_SECRET harus memiliki panjang minimal 32 byte.");
}

const authUrlValue = env.BETTER_AUTH_URL?.trim() || env.AUTH_URL?.trim() || "";
if (!authUrlValue) issues.push("BETTER_AUTH_URL belum diisi (AUTH_URL lama masih didukung sementara).");
const authUrl = authUrlValue ? (() => {
  try {
    const url = new URL(authUrlValue);
    if (url.protocol !== "https:" || url.username || url.password) {
      issues.push("BETTER_AUTH_URL harus berupa URL HTTPS tanpa credential.");
      return null;
    }
    return url;
  } catch {
    issues.push("BETTER_AUTH_URL bukan URL yang valid.");
    return null;
  }
})() : null;
const appUrl = requireHttpsUrl("NEXT_PUBLIC_APP_URL");
if (authUrl && appUrl && authUrl.origin !== appUrl.origin) {
  issues.push("BETTER_AUTH_URL dan NEXT_PUBLIC_APP_URL harus memakai origin yang sama.");
}

requireValue("AUTH_GOOGLE_ID");
requireValue("AUTH_GOOGLE_SECRET");
const clientIpHeader = requireValue("AUTH_CLIENT_IP_HEADER");
if (clientIpHeader && !/^[a-zA-Z0-9-]+$/.test(clientIpHeader)) {
  issues.push("AUTH_CLIENT_IP_HEADER harus berupa nama header HTTP yang valid.");
}
requireValue("RESEND_API_KEY");
const sender = requireValue("RESEND_FROM_EMAIL");
const senderEmail = sender.match(/<([^<>]+)>/)?.[1] ?? sender;
if (sender && !z.string().email().safeParse(senderEmail.trim()).success) {
  issues.push("RESEND_FROM_EMAIL harus memuat alamat email pengirim yang valid.");
}

const supportEmail = requireValue("SUPPORT_EMAIL");
if (supportEmail && !z.string().email().safeParse(supportEmail).success) {
  issues.push("SUPPORT_EMAIL harus berisi alamat email yang valid.");
}
const contactAddress = requireValue("BUSINESS_CONTACT_ADDRESS");
if (contactAddress && contactAddress.length < 8) {
  issues.push("BUSINESS_CONTACT_ADDRESS perlu berisi alamat kontak yang dapat digunakan pelanggan.");
}
const supportPhone = requireValue("SUPPORT_PHONE");
if (supportPhone && supportPhone.replace(/\D/g, "").length < 8) {
  issues.push("SUPPORT_PHONE harus berisi nomor kontak yang valid.");
}
requireValue("BUSINESS_LEGAL_NAME");

const effectiveDate = requireValue("POLICY_EFFECTIVE_DATE");
const effectiveDateParsed = new Date(`${effectiveDate}T00:00:00.000Z`);
const validEffectiveDate = /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
  && Number.isFinite(effectiveDateParsed.getTime())
  && effectiveDateParsed.toISOString().slice(0, 10) === effectiveDate;
if (effectiveDate && !validEffectiveDate) {
  issues.push("POLICY_EFFECTIVE_DATE harus menggunakan format YYYY-MM-DD.");
}

requireValue("MIDTRANS_SERVER_KEY");
requireValue("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY");
if (env.MIDTRANS_IS_PRODUCTION?.trim().toLowerCase() !== "true") {
  issues.push("MIDTRANS_IS_PRODUCTION harus bernilai true untuk menerima pembayaran produksi.");
}

requireValue("QUESTION_IMAGE_S3_BUCKET");
requireValue("QUESTION_IMAGE_S3_REGION");
requireValue("QUESTION_IMAGE_S3_ACCESS_KEY_ID");
requireValue("QUESTION_IMAGE_S3_SECRET_ACCESS_KEY");
const storageEndpoint = env.QUESTION_IMAGE_S3_ENDPOINT?.trim();
if (storageEndpoint) {
  try {
    const endpoint = new URL(storageEndpoint);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      issues.push("QUESTION_IMAGE_S3_ENDPOINT harus berupa URL HTTPS tanpa credential.");
    }
  } catch {
    issues.push("QUESTION_IMAGE_S3_ENDPOINT bukan URL yang valid.");
  }
}

if (issues.length > 0) {
  console.error("Preflight production gagal:");
  for (const issue of issues) console.error(`- ${issue}`);
  console.error("Nilai environment tidak ditampilkan. Lengkapi secret pada dashboard hosting dan jalankan ulang perintah ini.");
  process.exitCode = 1;
} else {
  console.info("Preflight production lolos. Pemeriksaan ini memvalidasi kelengkapan dan format konfigurasi, bukan konektivitas atau izin penyedia eksternal.");
}
