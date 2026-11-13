import { PolicyPage } from "@/components/legal/policy-page";
import { getLegalConfig } from "@/lib/legal-config";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata({
  title: "Kebijakan Privasi",
  description:
    "Baca cara ASNPedia mengumpulkan, menggunakan, menyimpan, dan melindungi data akun, latihan, serta transaksi.",
  path: "/kebijakan-privasi",
});

export default function PrivacyPolicyPage() {
  const { operatorName } = getLegalConfig();

  return (
    <PolicyPage
      title="Kebijakan Privasi"
      description={`Kebijakan ini menjelaskan cara ${operatorName} mengelola data saat kamu menggunakan ASNPedia.`}
    >
      <section>
        <h2 className="text-lg font-semibold">1. Data yang kami gunakan</h2>
        <p>Kami menggunakan data akun seperti nama, alamat email, foto profil dari Google bila kamu memilih login Google, dan kata sandi yang disimpan dalam bentuk hash. Untuk menjalankan layanan, kami juga memproses paket yang dimiliki, jawaban dan skor tryout, waktu sesi, serta data pesanan dan konfirmasi pembayaran. Nama, email, dan nomor telepon yang kamu masukkan saat checkout digunakan untuk bukti transaksi dan bantuan pelanggan. Untuk membatasi percobaan login, pendaftaran, permintaan soal, dan unggahan berulang, sistem membuat penanda berkunci dari alamat jaringan dan akun; alamat jaringan mentah tidak disimpan dalam tabel pembatasan permintaan.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">2. Tujuan pemrosesan</h2>
        <p>Data digunakan untuk membuat dan mengamankan akun, memberikan akses paket, menyimpan jawaban dan hasil latihan, memproses transaksi, mengirim verifikasi atau pemulihan akun, membatasi penyalahgunaan, memenuhi kewajiban pencatatan transaksi, dan menanggapi pertanyaan atau pengaduan. Penanda pembatasan permintaan disimpan sementara dan dibersihkan otomatis setelah 24 jam tidak diperbarui.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">3. Penyedia layanan</h2>
        <p>Data yang diperlukan dapat diproses oleh penyedia hosting dan database, Midtrans untuk pembayaran, Resend untuk email, Google jika login Google digunakan, serta penyedia penyimpanan gambar soal. Kami hanya membagikan data yang diperlukan untuk fungsi masing-masing penyedia. Lokasi pemrosesan mengikuti layanan dan wilayah yang dipilih pengelola.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">4. Masa penyimpanan</h2>
        <p>Data terkait transaksi keuangan disimpan sekurang-kurangnya 10 tahun dan data PMSE lainnya sekurang-kurangnya 5 tahun sesuai ketentuan penyimpanan dalam <a className="underline underline-offset-2" href="https://peraturan.go.id/files/pp80-2019bt.pdf" target="_blank" rel="noreferrer">PP Nomor 80 Tahun 2019</a>. Setelah masa wajib tersebut berakhir, data dihapus atau dianonimkan ketika tidak lagi diperlukan, kecuali ada kewajiban hukum atau kebutuhan penyelesaian sengketa.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">5. Hak dan permintaan data</h2>
        <p>Kamu dapat meminta akses, koreksi, atau penghapusan data dan menyampaikan keberatan melalui kontak pengaduan pada halaman ini. Kami dapat meminta verifikasi kepemilikan akun. Penghapusan dapat dibatasi untuk data transaksi yang masih wajib disimpan atau diperlukan untuk menyelesaikan kewajiban dan sengketa.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">6. Cookie dan keamanan</h2>
        <p>Cookie sesi digunakan untuk menjaga autentikasi dan cookie preferensi digunakan untuk menyimpan pilihan tampilan sidebar. Kami menerapkan kontrol akses, pembatasan akses admin, dan pengamanan yang sesuai untuk melindungi data. Tidak ada sistem yang dapat menjamin keamanan mutlak; jika terjadi insiden yang berdampak pada data pribadi, kami akan menindaklanjuti dan memberi pemberitahuan sesuai ketentuan yang berlaku.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">7. Perubahan kebijakan</h2>
        <p>Jika cara pengelolaan data berubah, kebijakan ini diperbarui dan tanggal berlakunya dicantumkan di bagian atas halaman. Perubahan penting akan diberitahukan melalui layanan atau email akun bila diperlukan.</p>
      </section>
    </PolicyPage>
  );
}
