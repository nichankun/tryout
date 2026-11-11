import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "ASNPedia — Latihan SKD CPNS", template: "%s | ASNPedia" },
  description: "Platform latihan tryout SKD CPNS dengan hasil skor dan pembahasan.",
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
