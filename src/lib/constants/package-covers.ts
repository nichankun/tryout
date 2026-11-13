const COVER_TONES = [
  "radial-gradient(ellipse at 88% 0%, rgba(167, 139, 250, 0.24), transparent 58%)",
  "radial-gradient(ellipse at 88% 0%, rgba(45, 212, 191, 0.2), transparent 58%)",
  "radial-gradient(ellipse at 88% 0%, rgba(251, 191, 36, 0.2), transparent 58%)",
  "radial-gradient(ellipse at 88% 0%, rgba(96, 165, 250, 0.22), transparent 58%)",
  "radial-gradient(ellipse at 88% 0%, rgba(244, 114, 182, 0.18), transparent 58%)",
] as const;

export const PACKAGE_COVER_KEYS = ["nalar", "fokus", "progres", "wawasan"] as const;

export type PackageCoverKey = (typeof PACKAGE_COVER_KEYS)[number];

export const PACKAGE_COVER_OPTIONS: {
  key: PackageCoverKey;
  label: string;
  image: string;
  alt: string;
  keywords: readonly string[];
}[] = [
  {
    key: "nalar",
    label: "Nalar dan logika",
    image: "/package-covers/nalar-blue.png",
    alt: "Ilustrasi abstrak balok geometri dan garis orbit untuk tema nalar",
    keywords: ["tiu", "logika", "numerik", "figural", "verbal", "penalaran", "analitis"],
  },
  {
    key: "fokus",
    label: "Fokus latihan",
    image: "/package-covers/fokus-blue.png",
    alt: "Ilustrasi abstrak kompas bercahaya untuk tema fokus latihan",
    keywords: ["tkp", "karakter", "kepribadian", "situasional", "fokus", "simulasi"],
  },
  {
    key: "progres",
    label: "Progres belajar",
    image: "/package-covers/progres-blue.png",
    alt: "Ilustrasi abstrak jalur bertingkat untuk tema progres belajar",
    keywords: ["intensif", "strategi", "progres", "lanjutan", "pemula"],
  },
  {
    key: "wawasan",
    label: "Wawasan kebangsaan",
    image: "/package-covers/wawasan-blue.png",
    alt: "Ilustrasi abstrak lembar pengetahuan dan bentuk kristal",
    keywords: ["twk", "wawasan", "kebangsaan", "pancasila", "nasional"],
  },
];

export function getPackageCover(
  key: string | null | undefined,
  fallbackIndex = 0,
  context?: string | null,
) {
  const safeIndex = Number.isFinite(fallbackIndex)
    ? Math.abs(Math.trunc(fallbackIndex))
    : 0;
  const normalizedContext = context?.toLocaleLowerCase("id-ID");
  const contextualCover = normalizedContext
    ? PACKAGE_COVER_OPTIONS.find((cover) =>
        cover.keywords.some((keyword) => normalizedContext.includes(keyword)),
      )
    : undefined;
  const selectedCover = PACKAGE_COVER_OPTIONS.find((cover) => cover.key === key);
  const cover = selectedCover ?? contextualCover ?? PACKAGE_COVER_OPTIONS[safeIndex % PACKAGE_COVER_OPTIONS.length];
  const tone = COVER_TONES[safeIndex % COVER_TONES.length];

  return { ...cover, tone };
}
