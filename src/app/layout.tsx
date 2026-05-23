import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. Tambahkan suppressHydrationWarning agar tidak error saat transisi tema
    <html
      lang="en"
      className={cn("font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/* 3. Bungkus seluruh aplikasi dengan ThemeProvider */}

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}