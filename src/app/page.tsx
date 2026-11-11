import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import {
  ArrowRight,
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Layers,
  Target,
} from "lucide-react";
import { db } from "@/db";
import { questions, tryoutPackages } from "@/db/database/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_FEE } from "@/lib/constants/billing";
import { TIMER_CONFIG } from "@/types/tryout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ASNPedia — Tryout dan Latihan SKD",
  description: "Pilih paket latihan SKD, kerjakan simulasi, dan pelajari skor serta pembahasan soal.",
  openGraph: {
    title: "ASNPedia — Tryout dan Latihan SKD",
    description: "Pilih paket latihan SKD, kerjakan simulasi, dan pelajari skor serta pembahasan soal.",
    type: "website",
    locale: "id_ID",
    siteName: "ASNPedia",
  },
  twitter: {
    card: "summary",
    title: "ASNPedia — Tryout dan Latihan SKD",
    description: "Pilih paket latihan SKD, kerjakan simulasi, dan pelajari skor serta pembahasan soal.",
  },
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const learningSteps = [
  {
    number: "01",
    icon: Target,
    title: "Pilih paket SKD",
    description: "TWK, TIU, dan TKP dalam satu paket.",
    position: "19.2%",
    top: "25%",
    connector: "5.1vw",
    titleGap: "2.2vw",
    tone: "violet",
  },
  {
    number: "02",
    icon: Clock3,
    title: "Kerjakan simulasi",
    description: "Latihan berbatas waktu.",
    position: "49.3%",
    top: "38.7%",
    connector: "3.3vw",
    titleGap: "1.4vw",
    tone: "violet",
  },
  {
    number: "03",
    icon: ChartNoAxesColumnIncreasing,
    title: "Pelajari progres",
    description: "Lihat skor dan pembahasan.",
    position: "80.8%",
    top: "25%",
    connector: "5.1vw",
    titleGap: "2.2vw",
    tone: "mint",
  },
];

const landingPackageCovers = [
  {
    image: "/package-covers/landing-nalar.png",
    alt: "Balok dan bentuk geometri transparan dalam nuansa lavender",
  },
  {
    image: "/package-covers/landing-fokus.png",
    alt: "Lingkaran fokus dan jalur cahaya keemasan",
  },
  {
    image: "/package-covers/landing-progres.png",
    alt: "Tangga progres dengan pita ungu dan titik mint",
  },
] as const;

export default async function HomePage() {
  const packageStats = await db
    .select({
      id: tryoutPackages.id,
      title: tryoutPackages.title,
      price: tryoutPackages.price,
      questionCount: count(questions.id),
    })
    .from(tryoutPackages)
    .leftJoin(questions, eq(questions.packageId, tryoutPackages.id))
    .where(eq(tryoutPackages.isActive, true))
    .groupBy(tryoutPackages.id, tryoutPackages.title, tryoutPackages.price)
    .orderBy(asc(tryoutPackages.id));
  const availablePackages = packageStats.filter((pkg) => pkg.questionCount > 0);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <Link
        href="#paket"
        className="sr-only z-50 rounded-md bg-white px-4 py-3 font-semibold text-purple-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Langsung ke paket latihan
      </Link>
      <section className="relative isolate min-h-[760px] overflow-hidden bg-[radial-gradient(ellipse_at_70%_48%,rgba(187,161,255,0.13),transparent_52%),linear-gradient(115deg,#fbf8ff_0%,#f7f4fc_64%,#f4f0fb_100%)] lg:min-h-[100svh]">
        <header className="relative z-20 mx-auto flex h-[clamp(5.25rem,7.4vw,7.75rem)] w-full items-center justify-between px-6 pt-[clamp(2rem,2.6vw,2.75rem)] sm:px-10 lg:px-[5.4vw]">
          <Link href="/" className="relative inline-flex items-center" aria-label="ASNPedia, beranda">
            <span className="relative text-[clamp(2rem,2.65vw,2.75rem)] font-black leading-none tracking-[-0.065em] text-purple-950">
              ASN<span className="text-primary">Pedia</span>
              <span aria-hidden="true" className="absolute -top-[0.45rem] left-[42%] h-[clamp(0.55rem,0.72vw,0.75rem)] w-[clamp(1.5rem,2.4vw,2.5rem)] -rotate-[12deg] rounded-[100%] border-t-[5px] border-amber-400" />
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-full border border-purple-200/80 bg-white/65 px-5 text-sm font-bold text-purple-950 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-11 sm:px-6"
          >
            Masuk
          </Link>
        </header>

        <div className="pointer-events-none absolute inset-x-0 top-[clamp(5.25rem,7.4vw,7.75rem)] bottom-0 z-0 hidden overflow-hidden lg:block" aria-hidden="true">
          <Image
            src="/hero-ribbon.png"
            alt=""
            fill
            preload
            sizes="84vw"
            className="hero-ribbon-art object-contain object-right"
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(760px_-_clamp(5.25rem,7.4vw,7.75rem))] w-full flex-col px-6 pb-12 pt-8 sm:px-10 sm:pt-12 lg:min-h-[calc(100svh_-_7.4vw)] lg:px-[5.4vw] lg:pb-20 lg:pt-[4.2vw]">
          <div className="max-w-[760px]">
            <p className="mb-[clamp(1.25rem,1.9vw,2rem)] flex items-center gap-[clamp(0.75rem,1.2vw,1.25rem)] text-[clamp(0.9rem,1.1vw,1.15rem)] font-extrabold uppercase tracking-[0.2em] text-purple-900">
              <span aria-hidden="true" className="h-[clamp(0.375rem,0.55vw,0.5625rem)] w-[clamp(2.75rem,4.2vw,4.375rem)] rounded-full bg-purple-400" />
              SKD CPNS
            </p>

            <h1 className="text-[clamp(2.75rem,6.7vw,7rem)] font-black leading-[1.12] tracking-[-0.045em] text-purple-950">
              <span className="block">Pahami</span>
              <span className="mt-2 block pb-[0.08em] bg-gradient-to-r from-[#4936AE] via-[#5948C8] to-[#7958E5] bg-clip-text text-transparent">
                progresmu.<span aria-hidden="true" className="hero-caret ml-[0.12em] inline-block h-[0.88em] w-[3px] translate-y-[0.08em] bg-[#8F21FF] align-baseline shadow-[0_0_13px_3px_rgba(143,33,255,0.7)] sm:w-1" />
              </span>
            </h1>

            <p className="mt-7 text-lg font-medium leading-8 tracking-[-0.025em] text-purple-950 sm:text-[clamp(1.15rem,1.8vw,1.9rem)] sm:leading-[1.35]">
              Satu paket lengkap. Progres yang jelas.
            </p>

            <Button asChild className="mt-10 h-[62px] rounded-[14px] bg-primary px-8 text-lg font-bold text-primary-foreground shadow-[0_12px_28px_-14px_rgba(73,54,174,0.75)] transition-all hover:-translate-y-0.5 hover:bg-purple-700 sm:mt-[2.2vw] sm:h-[clamp(3.5rem,4.5vw,4.625rem)] sm:w-[clamp(11rem,16.6vw,277px)] sm:px-6 sm:text-[clamp(1.4rem,1.85vw,1.9rem)]">
              <Link href="#paket">Lihat paket</Link>
            </Button>
          </div>

          <div className="relative mt-10 h-[230px] w-full lg:hidden" aria-hidden="true">
            <Image
              src="/hero-ribbon.png"
              alt=""
              fill
              sizes="100vw"
              className="hero-ribbon-art object-contain object-right"
            />
          </div>
        </div>
      </section>

      <section
        id="cara-kerja"
        className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_76%_43%,rgba(187,161,255,0.12),transparent_48%),linear-gradient(115deg,#fbf8ff_0%,#f7f4fc_64%,#f4f0fb_100%)] pb-20 pt-[clamp(4.5rem,16vw,15rem)] sm:pb-24 lg:min-h-[100svh] lg:pb-0"
      >
        <div className="relative z-10 px-[5.4vw]">
          <p className="flex items-center gap-[clamp(0.75rem,1.2vw,1.25rem)] text-[clamp(0.9rem,1.1vw,1.15rem)] font-extrabold uppercase tracking-[0.2em] text-purple-900">
            <span aria-hidden="true" className="h-[clamp(0.375rem,0.55vw,0.5625rem)] w-[clamp(2.75rem,4.2vw,4.375rem)] rounded-full bg-purple-400" />
            Alur latihan
          </p>
          <h2 className="mt-[clamp(1.5rem,3vw,3rem)] text-[clamp(2.25rem,4.5vw,4.5rem)] font-black leading-[1.02] tracking-[-0.06em] text-purple-950">
            Dari latihan, jadi <span className="bg-gradient-to-r from-[#4936AE] via-[#5948C8] to-[#7958E5] bg-clip-text text-transparent">progres.</span>
          </h2>
        </div>

        <div className="learning-flow-motion relative -mt-[2.6vw] hidden h-[38vw] min-h-[390px] w-full overflow-hidden lg:block">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[27.6vw]" aria-hidden="true">
            <Image
              src="/learning-wave.png"
              alt=""
              fill
              sizes="100vw"
              className="object-fill"
            />
          </div>
          <span
            aria-hidden="true"
            className="absolute left-[67%] top-[26%] z-[1] h-[clamp(0.65rem,1.1vw,1rem)] w-[clamp(0.65rem,1.1vw,1rem)] -translate-x-1/2 rounded-full border-2 border-white bg-amber-300 shadow-[0_0_18px_6px_rgba(242,193,94,0.45)]"
          />

          {learningSteps.map(({ number, icon: Icon, title, description, position, top, connector, titleGap, tone }) => (
            <article
              key={number}
              className="absolute z-10 flex w-[clamp(220px,22vw,360px)] -translate-x-1/2 flex-col items-center text-center"
              style={{ left: position, top }}
            >
              <span
                className={`flex h-[5.1vw] w-[5.1vw] items-center justify-center rounded-full border-[5px] bg-white/95 shadow-[0_8px_24px_rgba(73,54,174,0.15)] ring-[5px] ring-purple-200/65 ${
                  tone === "mint"
                    ? "border-white text-teal-600 shadow-[0_8px_24px_rgba(66,191,160,0.2)] ring-teal-200/70"
                    : "border-white text-purple-700"
                }`}
              >
                <span className="text-[clamp(1.25rem,2vw,1.9rem)] font-black tracking-[-0.04em]">{number}</span>
              </span>
              <span aria-hidden="true" className="w-px bg-primary/55" style={{ height: connector }} />
              <Icon
                className={`h-[2.8vw] w-[2.8vw] stroke-[2.2] ${tone === "mint" ? "text-teal-600" : "text-primary"}`}
                aria-hidden
              />
              <h3 className="text-[clamp(1.25rem,2.2vw,2.6rem)] font-extrabold leading-tight tracking-[-0.04em] text-purple-950" style={{ marginTop: titleGap }}>
                {title}
              </h3>
              <p className="mt-2 max-w-[20em] text-[clamp(1rem,1.55vw,1.6rem)] leading-[1.4] text-purple-950/90">
                {description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 space-y-8 px-[5.4vw] lg:hidden">
          {learningSteps.map(({ number, icon: Icon, title, description }, index) => (
            <article key={number} className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-5">
              <div className="flex flex-col items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-white text-lg font-black text-primary shadow-md shadow-purple-950/10 ring-4 ring-purple-200/60">
                  {number}
                </span>
                {index < learningSteps.length - 1 && <span aria-hidden="true" className="my-2 h-10 w-px bg-primary/40" />}
              </div>
              <div className="pb-3 pt-1">
                <div className="flex items-center gap-3 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                  <h3 className="text-xl font-extrabold tracking-tight text-purple-950">{title}</h3>
                </div>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="paket"
        className="scroll-mt-20 overflow-hidden bg-[radial-gradient(ellipse_at_76%_36%,rgba(187,161,255,0.12),transparent_48%),linear-gradient(115deg,#fbf8ff_0%,#f7f4fc_64%,#f4f0fb_100%)] py-[clamp(4rem,9vw,9rem)]"
      >
        <div className="pl-[4.5vw] pr-[3.4vw]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-[clamp(0.75rem,1.2vw,1.25rem)] text-[clamp(0.9rem,1.1vw,1.15rem)] font-extrabold uppercase tracking-[0.2em] text-purple-900">
                <span aria-hidden="true" className="h-[clamp(0.375rem,0.55vw,0.5625rem)] w-[clamp(2.75rem,4.2vw,4.375rem)] rounded-full bg-purple-400" />
                Mulai dari sini
              </p>
              <h2 className="mt-[clamp(1.25rem,2vw,2rem)] text-[clamp(2.25rem,4vw,4rem)] font-black leading-[1.02] tracking-[-0.06em] text-purple-950">
                Pilih paket <span className="bg-gradient-to-r from-[#4936AE] via-[#5948C8] to-[#7958E5] bg-clip-text text-transparent">latihanmu</span>
              </h2>
              <p className="mt-3 text-[clamp(1rem,1.5vw,1.5rem)] leading-[1.4] text-muted-foreground">
                Satu paket lengkap untuk latihan SKD.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-3 rounded-full bg-purple-100/85 px-5 py-3 text-[clamp(0.95rem,1.25vw,1.25rem)] font-semibold text-purple-900 md:mb-1">
              <BookOpenCheck className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              {availablePackages.length} paket tersedia
            </div>
          </div>

          {availablePackages.length === 0 ? (
            <Card className="mt-12 rounded-2xl border-dashed border-purple-200 bg-white/70">
              <CardContent className="py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-primary">
                  <BookOpenCheck className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 font-bold text-purple-950">Paket latihan sedang disiapkan</h3>
                <p className="mt-1 text-sm text-muted-foreground">Paket akan muncul di sini setelah tersedia.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-[1.1vw] mt-[clamp(2.5rem,5vw,5rem)] grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-[1.5vw]">
              {availablePackages.map((pkg, index) => {
                const cover = landingPackageCovers[index % landingPackageCovers.length];
                const volumeTitle = pkg.title.match(/^volume\s*(\d+)$/i);
                const displayTitle = volumeTitle
                  ? `Volume ${volumeTitle[1].padStart(2, "0")}`
                  : pkg.title;

                return (
                  <Card
                    key={pkg.id}
                    className="group flex h-full flex-col gap-0 overflow-hidden rounded-[1.7rem] border border-purple-200/80 bg-white py-0 shadow-[0_14px_36px_-22px_rgba(48,16,86,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-[0_20px_44px_-20px_rgba(48,16,86,0.28)]"
                  >
                    <div className="relative aspect-[2.08/1] overflow-hidden bg-purple-100">
                      <Image
                        src={cover.image}
                        alt={cover.alt}
                        fill
                        sizes="(max-width: 768px) 92vw, (max-width: 1279px) 45vw, 30vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                      />
                    </div>

                    <CardHeader className="gap-0 px-6 pb-0 pt-5 sm:px-8 sm:pt-6">
                      <CardTitle className="line-clamp-2 break-words text-[clamp(1.5rem,2.3vw,2.25rem)] font-extrabold leading-tight tracking-[-0.045em] text-purple-950" title={pkg.title}>
                        {displayTitle}
                      </CardTitle>
                      <span className="mt-3 inline-flex w-fit items-center rounded-full bg-purple-100 px-4 py-1.5 text-[clamp(0.9rem,1.2vw,1.15rem)] font-bold leading-none text-primary">
                        TWK <span className="mx-2 text-purple-300">·</span> TIU <span className="mx-2 text-purple-300">·</span> TKP
                      </span>
                    </CardHeader>

                    <CardContent className="mt-5 px-6 pb-0 sm:px-8">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[clamp(0.95rem,1.3vw,1.25rem)] font-medium text-purple-950">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <Layers className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                          <span><strong className="font-bold">{pkg.questionCount}</strong> soal</span>
                        </div>
                        <span aria-hidden="true" className="h-8 w-px bg-purple-200" />
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          <Clock3 className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                          <span>{Math.round(TIMER_CONFIG.durationSeconds / 60)} menit</span>
                        </div>
                      </div>
                      <p className="mt-[clamp(1.5rem,2.2vw,2.25rem)] text-[clamp(1.75rem,2.3vw,2.4rem)] font-black leading-none tracking-[-0.04em] text-purple-950">
                        {pkg.price === 0 ? "Gratis" : currency.format(pkg.price)}
                      </p>
                      {pkg.price > 0 && SERVICE_FEE > 0 && (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          Biaya layanan {currency.format(SERVICE_FEE)} ditambahkan saat checkout.
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="mt-auto px-6 pb-6 pt-7 sm:px-7 sm:pb-7">
                      <Button asChild className="h-[clamp(3.5rem,4vw,3.75rem)] w-full rounded-[14px] bg-primary text-[clamp(1rem,1.4vw,1.375rem)] font-bold text-primary-foreground shadow-[0_10px_24px_-14px_rgba(73,54,174,0.75)] transition-all hover:bg-purple-700 group-hover:shadow-primary/25">
                        <Link href={`/checkout/${pkg.id}`}>
                          {pkg.price === 0 ? "Mulai paket" : "Lihat paket"}
                          <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-14 pt-16 md:px-6 md:pb-16 md:pt-20 xl:px-10" aria-labelledby="signup-heading">
        <div className="relative isolate mx-auto flex min-h-[17rem] max-w-[1800px] items-center overflow-hidden rounded-[2rem] bg-[linear-gradient(112deg,#29143f_0%,#3e2578_48%,#5b43c8_100%)] px-7 py-10 text-white shadow-[0_28px_70px_-36px_rgba(68,44,139,0.72)] sm:rounded-[2.5rem] sm:px-10 md:min-h-[19rem] md:px-14 lg:px-[5.2%]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_20%,rgba(151,112,255,0.42),transparent_42%),radial-gradient(ellipse_at_42%_115%,rgba(176,119,255,0.22),transparent_42%)]" />
          <Image
            src="/learning-wave.png"
            alt=""
            fill
            sizes="100vw"
            className="pointer-events-none -z-10 object-cover object-center opacity-35 mix-blend-screen sm:opacity-45"
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute right-[26%] top-[43%] -z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-300 shadow-[0_0_14px_7px_rgba(52,211,153,0.6)] sm:right-[27%] sm:h-4 sm:w-4" aria-hidden="true" />
          <div className="relative flex w-full flex-col gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-purple-100 sm:text-xs">Satu langkah kecil hari ini</p>
              <h2 id="signup-heading" className="mt-3 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[2.2rem]">Mulai latihanmu dengan lebih terarah.</h2>
              <p className="mt-3 text-sm leading-6 text-purple-100/90 sm:text-base">Simpan sesi dan pantau progresmu dalam satu akun.</p>
            </div>
            <Button asChild size="lg" className="h-14 w-full shrink-0 rounded-2xl bg-white px-7 text-base font-bold text-purple-950 shadow-lg shadow-black/10 hover:bg-purple-50 sm:w-auto sm:min-w-[16rem]">
              <Link href="/register">Buat akun gratis <ArrowRight className="ml-3 h-5 w-5" aria-hidden /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-purple-100/80 bg-white">
        <div className="mx-auto flex max-w-[1880px] flex-col gap-6 px-5 py-8 sm:px-8 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-9">
          <div className="max-w-2xl">
            <Link href="/" className="text-lg font-extrabold tracking-tight text-purple-950">ASNPedia</Link>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">Layanan latihan mandiri. Tidak berafiliasi dengan BKN dan tidak menjamin hasil seleksi resmi.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-purple-950 sm:text-sm" aria-label="Kebijakan dan bantuan">
            <Link className="transition-colors hover:text-primary" href="/syarat-ketentuan">Syarat dan ketentuan</Link>
            <Link className="transition-colors hover:text-primary" href="/kebijakan-privasi">Privasi</Link>
            <Link className="transition-colors hover:text-primary" href="/kebijakan-refund">Refund</Link>
            <Link className="transition-colors hover:text-primary" href="/bantuan">Bantuan</Link>
          </nav>
          <p className="shrink-0 text-xs text-slate-400 sm:text-sm">© {new Date().getFullYear()} ASNPedia</p>
        </div>
      </footer>
    </main>
  );
}
