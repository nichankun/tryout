import Link from "next/link";
import { PolicyPage } from "@/components/legal/policy-page";
import { getLegalConfig } from "@/lib/legal-config";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata({
  title: "Syarat dan Ketentuan",
  description:
    "Ketentuan penggunaan ASNPedia untuk latihan mandiri, simulasi SKD CPNS, akses paket, dan transaksi.",
  path: "/syarat-ketentuan",
});

export default function TermsPage() {
  const { operatorName } = getLegalConfig();

  return (
    <PolicyPage
      title="Syarat dan Ketentuan"
      description={`Ketentuan penggunaan layanan latihan ASNPedia yang dikelola oleh ${operatorName}.`}
    >
      <section>
        <h2 className="text-lg font-semibold">1. Tentang layanan</h2>
        <p>ASNPedia menyediakan paket latihan mandiri, simulasi berbatas waktu, hasil skor, dan pembahasan. ASNPedia adalah layanan independen, bukan bagian dari atau afiliasi dengan BKN maupun instansi penyelenggara seleksi. Skor latihan bukan hasil seleksi resmi dan tidak menjamin kelulusan.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">2. Akun dan penggunaan</h2>
        <p>Gunakan informasi akun yang benar, jaga kerahasiaan kata sandi, dan segera laporkan aktivitas yang tidak kamu kenali. Akses paket terhubung dengan akun yang membelinya. Dilarang membagikan akun untuk menghindari pembayaran, mengganggu layanan, mencoba mengakses data pengguna lain, atau menggunakan materi dengan cara yang melanggar hak pihak lain.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">3. Informasi paket dan akses</h2>
        <p>Judul, isi, jumlah soal, durasi, harga, dan batas akses ditampilkan sebelum pesanan dibuat. Akses diberikan setelah pembayaran dikonfirmasi atau saat paket gratis diambil. Simulasi yang sudah dimulai mengikuti waktu sesi yang tampil di aplikasi. Riwayat hasil tetap mengikuti kebijakan penyimpanan data.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">4. Pembayaran, pembatalan, dan pengembalian</h2>
        <p>Pembayaran diproses melalui penyedia pembayaran yang ditampilkan saat checkout. Biaya tambahan, jika ada, harus terlihat sebelum pembayaran diselesaikan. Jika pembayaran berhasil tetapi akses belum terbuka, atau terjadi pembayaran ganda, segera ajukan pengaduan dengan ID pesanan. Ketentuan pembatalan dan pengembalian dana dijelaskan pada <Link className="underline underline-offset-2" href="/kebijakan-refund">Kebijakan Refund</Link>.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">5. Materi dan hak penggunaan</h2>
        <p>Materi latihan, soal, pembahasan, gambar, dan desain hanya digunakan untuk latihan pribadi. Dilarang menyalin, menerbitkan ulang, menjual, atau mendistribusikannya tanpa izin pemegang hak. Pengelola hanya akan memublikasikan materi yang memiliki dasar penggunaan yang sesuai.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">6. Ketersediaan layanan</h2>
        <p>Kami berupaya menjaga layanan tetap tersedia dan memulihkan gangguan secepat mungkin. Pemeliharaan atau gangguan penyedia infrastruktur dapat membuat sebagian fitur tidak tersedia sementara. Jika gangguan menghalangi penggunaan paket yang telah dibeli, hubungi pengelola agar akses atau penyelesaian yang sesuai dapat diberikan.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">7. Pengaduan dan perubahan ketentuan</h2>
        <p>Untuk pertanyaan, kendala, atau sengketa, gunakan prosedur serta kontak yang tercantum di halaman <Link className="underline underline-offset-2" href="/bantuan">Bantuan</Link>. Ketentuan yang diperbarui berlaku sejak tanggal yang dicantumkan dan tidak menghapus hak yang telah timbul dari transaksi sebelumnya. Ketentuan ini tidak membatasi hak konsumen yang diberikan oleh peraturan perundang-undangan.</p>
      </section>
    </PolicyPage>
  );
}
