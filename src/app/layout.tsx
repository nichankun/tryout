import "./globals.css";
import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, SOCIAL_IMAGE_PATH } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: "Tryout SKD CPNS Online | ASNPedia", template: "%s | ASNPedia" },
  description:
    "Persiapkan SKD CPNS dengan latihan TWK, TIU, dan TKP berbatas waktu, hasil skor, serta pembahasan soal.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    title: "Tryout SKD CPNS Online | ASNPedia",
    description:
      "Persiapkan SKD CPNS dengan latihan TWK, TIU, dan TKP berbatas waktu, hasil skor, serta pembahasan soal.",
    url: SITE_URL,
    images: [
      {
        url: SOCIAL_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "ASNPedia — Tryout dan latihan SKD CPNS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tryout SKD CPNS Online | ASNPedia",
    description:
      "Persiapkan SKD CPNS dengan latihan TWK, TIU, dan TKP berbatas waktu, hasil skor, serta pembahasan soal.",
    images: [SOCIAL_IMAGE_PATH],
  },
  icons: { icon: "/asnpedia-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. Tambahkan suppressHydrationWarning agar tidak error saat transisi tema
    <html
      lang="id"
      className="font-sans"
      suppressHydrationWarning
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
