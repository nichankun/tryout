/**
 * app/(auth)/layout.tsx
 *
 * ✅ Layout khusus untuk route group (auth): /login dan /register
 * ✅ Tidak ada Navbar, Sidebar, atau Footer — halaman auth harus clean
 * ✅ Server Component — tidak perlu "use client"
 *
 * Kenapa ini penting:
 *   Tanpa file ini, halaman login/register akan mewarisi root layout yang
 *   biasanya berisi Navbar. Hasilnya: Navbar muncul di atas form login
 *   yang terlihat aneh dan tidak profesional.
 *
 * Route Group (auth) hanya mengubah layout, tidak mengubah URL.
 *   /login     → app/(auth)/login/page.tsx    ✅
 *   /register  → app/(auth)/register/page.tsx ✅
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout ini sengaja minimal — halaman auth punya desain sendiri
  // yang sudah full-screen (min-h-screen dengan panel kiri + kanan)
  return <>{children}</>;
}