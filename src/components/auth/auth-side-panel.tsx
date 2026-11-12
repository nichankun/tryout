import Image from "next/image";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

interface AuthSidePanelProps {
  title: string;
  description: string;
  benefits: readonly string[];
}

export function AuthSidePanel({ title, description, benefits }: AuthSidePanelProps) {
  return (
    <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-purple-950 p-10 text-white lg:flex xl:p-14">
      <div className="absolute inset-0">
        <Image
          src="/tryout-hero.png"
          alt=""
          fill
          preload
          sizes="(max-width: 1280px) 50vw, 48vw"
          className="object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/95 via-purple-950/85 to-indigo-950/85" />
        <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-40 right-[-5rem] h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3" aria-label="ASNPedia, beranda">
        <BrandLogo tone="inverse" markClassName="size-11" textClassName="text-xl" />
      </Link>

      <div className="relative z-10 my-12 max-w-xl">
        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-100 backdrop-blur-sm">
          Persiapan SKD CPNS
        </span>
        <h2 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">{title}</h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-violet-100/85">{description}</p>

        <ul className="mt-8 grid gap-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-sm font-medium text-white/95 shadow-lg shadow-purple-950/10 backdrop-blur-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs text-violet-100/75">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Latihan mandiri · Tidak berafiliasi dengan BKN
        </span>
        <span className="font-semibold tracking-wide">Belajar · ukur · ulangi</span>
      </div>
    </aside>
  );
}
