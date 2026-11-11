import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Bantuan" };

export default function HelpPage() {
  const contact = getLegalConfig();

  return (
    <main className="container mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12">
      <Card className="w-full rounded-2xl border-purple-100 shadow-sm">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">ASNPedia</p>
          <CardTitle className="text-2xl">Bantuan pelanggan</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Kami membantu kendala akun, akses paket, materi, dan transaksi. Sertakan email akun dan ID pesanan agar laporan lebih cepat diperiksa.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {!contact.isComplete && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
              Kontak resmi pengelola belum lengkap. Pengelola perlu mengisi identitas, alamat, email, nomor telepon, dan tanggal berlaku sebelum menerima pelanggan.
            </p>
          )}

          <section className="space-y-2" aria-label="Kontak pengelola">
            <h2 className="text-sm font-semibold">Kontak pengelola</h2>
            <p className="text-sm text-muted-foreground">{contact.operatorName}</p>
            {contact.contactAddress ? <p className="text-sm text-muted-foreground">{contact.contactAddress}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {contact.supportEmail ? (
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={`mailto:${contact.supportEmail}`}><Mail className="mr-2 h-4 w-4" aria-hidden="true" />Email bantuan</a>
                </Button>
              ) : null}
              {contact.supportPhone ? (
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={`tel:${contact.supportPhone}`}><Phone className="mr-2 h-4 w-4" aria-hidden="true" />Telepon/WhatsApp</a>
                </Button>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl bg-[#F7F5FC] p-4">
            <h2 className="text-sm font-semibold">Prosedur dan waktu penanganan</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
              <li>Kirim email akun, ID pesanan bila terkait transaksi, waktu kejadian, dan langkah yang sudah dicoba.</li>
              <li>Jangan sertakan kata sandi, PIN, CVV, atau kode OTP.</li>
              <li>Kami menargetkan tanggapan awal dalam 2 hari kerja dan penyelesaian dalam 5 hari kerja. Jika perlu waktu tambahan, kami memberi kabar tentang statusnya.</li>
            </ol>
          </section>

          <div className="flex flex-wrap gap-4 text-sm">
            <Link className="text-primary underline underline-offset-2" href="/kebijakan-refund">Kebijakan pembatalan dan refund</Link>
            <Link className="text-primary underline underline-offset-2" href="/kebijakan-privasi">Kebijakan privasi</Link>
            <Link className="text-primary underline underline-offset-2" href="/">Kembali ke beranda</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
