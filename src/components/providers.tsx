"use client";

/**
 * components/providers.tsx
 *
 * ✅ Wrap seluruh app dengan SessionProvider NextAuth v5
 * ✅ Dibutuhkan agar useSession() bekerja di Client Components
 *
 * Tambahkan di app/layout.tsx:
 *   import { Providers } from "@/components/providers";
 *   <Providers>{children}</Providers>
 */

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}