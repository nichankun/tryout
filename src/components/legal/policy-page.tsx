import Link from "next/link";
import { getLegalConfig } from "@/lib/legal-config";

interface PolicyPageProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PolicyPage({ title, description, children }: PolicyPageProps) {
  const legal = getLegalConfig();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="font-extrabold text-primary">ASNPedia</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Kembali ke beranda</Link>
        </div>
      </header>
      <article className="container mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Pengelola: {legal.operatorName} · Berlaku: {legal.effectiveDate || "belum ditetapkan"}
        </p>
        {!legal.isComplete && (
          <aside className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
            <p className="font-semibold">Draf untuk ditinjau sebelum penjualan dibuka</p>
            <p className="mt-1">Lengkapi identitas pengelola, alamat kontak, email, nomor telepon, dan tanggal berlaku pada konfigurasi hosting.</p>
          </aside>
        )}
        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/90">{children}</div>
        <section className="mt-10 rounded-xl border border-border bg-card p-5" aria-label="Kontak pengaduan">
          <h2 className="font-semibold">Kontak dan pengaduan</h2>
          <address className="mt-2 space-y-1 not-italic text-sm leading-6 text-muted-foreground">
            <p>{legal.operatorName}</p>
            {legal.contactAddress ? <p>{legal.contactAddress}</p> : null}
            {legal.supportEmail ? <p>Email: <a className="underline underline-offset-2" href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a></p> : null}
            {legal.supportPhone ? <p>Telepon/WhatsApp: <a className="underline underline-offset-2" href={`tel:${legal.supportPhone}`}>{legal.supportPhone}</a></p> : null}
          </address>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Sertakan email akun dan nomor pesanan bila pengaduan terkait akses atau transaksi. Jangan kirim kata sandi, PIN, atau kode OTP.</p>
        </section>
        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground" aria-label="Kebijakan lainnya">
          <Link href="/syarat-ketentuan" className="hover:text-foreground">Syarat dan ketentuan</Link>
          <Link href="/kebijakan-privasi" className="hover:text-foreground">Privasi</Link>
          <Link href="/kebijakan-refund" className="hover:text-foreground">Refund</Link>
          <Link href="/bantuan" className="hover:text-foreground">Bantuan</Link>
        </nav>
      </article>
    </main>
  );
}
