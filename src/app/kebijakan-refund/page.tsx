import { PolicyPage } from "@/components/legal/policy-page";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata({
  title: "Kebijakan Refund",
  description:
    "Pelajari cara mengajukan bantuan untuk pembayaran ganda, akses paket SKD, pembatalan, dan pengembalian dana ASNPedia.",
  path: "/kebijakan-refund",
});

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Kebijakan Pembatalan dan Pengembalian Dana"
      description="Panduan pengaduan untuk pembayaran dan akses paket digital ASNPedia."
    >
      <section>
        <h2 className="text-lg font-semibold">1. Kondisi yang dapat diajukan</h2>
        <p>Hubungi kami jika pembayaran terduplikasi, pembayaran terkonfirmasi tetapi akses paket tidak terbuka, isi atau akses paket berbeda secara material dari informasi sebelum pembelian, atau gangguan teknis membuat layanan yang dibeli tidak dapat digunakan dan tidak berhasil dipulihkan. Permintaan pembatalan, penukaran, atau pengembalian diproses sesuai hak konsumen dan ketentuan yang berlaku.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">2. Jangka waktu pengajuan</h2>
        <p>Untuk penukaran atau pembatalan karena ketidaksesuaian, keterlambatan akses, kerusakan layanan, atau cacat yang tidak tampak sebelumnya, ajukan paling lambat 2 hari kerja sejak paket diterima atau akses diberikan. Pengajuan atas pembayaran ganda atau akses yang belum diberikan dapat disampaikan segera setelah diketahui. Batas waktu ini tidak mengurangi hak yang lebih luas berdasarkan hukum.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">3. Cara mengajukan</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Hubungi kontak pada halaman Bantuan menggunakan email akun.</li>
          <li>Sertakan ID pesanan, tanggal dan nominal pembayaran, paket yang dibeli, serta penjelasan kendala. Lampirkan bukti transaksi bila diperlukan.</li>
          <li>Jangan mengirim kata sandi, PIN, CVV, atau kode OTP.</li>
          <li>Kami mengirim tanggapan awal dalam 2 hari kerja dan menargetkan penyelesaian dalam 5 hari kerja. Jika pemeriksaan memerlukan waktu lebih lama, kami memberi pembaruan status.</li>
        </ol>
      </section>
      <section>
        <h2 className="text-lg font-semibold">4. Penanganan dan pengembalian</h2>
        <p>Kami terlebih dahulu memeriksa status pembayaran dan akses. Jika gangguan dapat diperbaiki, kami menawarkan pemulihan akses atau tambahan masa akses yang sepadan. Jika pembatalan atau refund disetujui, dana dikembalikan melalui metode pembayaran asal sejauh didukung penyedia pembayaran. Waktu dana diterima mengikuti proses bank atau penyedia pembayaran; kami akan menyampaikan status dan bukti prosesnya.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">5. Pemeriksaan dan batas kebijakan</h2>
        <p>Perubahan pikiran setelah paket digunakan dapat memengaruhi penyelesaian permintaan, tetapi tidak menghapus hak pembatalan atau pengembalian yang diwajibkan oleh peraturan. Setiap permintaan dinilai berdasarkan kondisi paket, catatan akses, status pembayaran, dan bukti yang disampaikan. Biaya yang dapat dikembalikan akan dijelaskan sebelum keputusan akhir; tidak ada biaya pengajuan pengaduan.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">6. Dasar informasi</h2>
        <p>Ketentuan ini disusun dengan memperhatikan aturan perdagangan melalui sistem elektronik, termasuk ketentuan tentang masa pengajuan pembatalan/penukaran, layanan pengaduan, dan pengembalian dana pada <a className="underline underline-offset-2" href="https://peraturan.go.id/files/pp80-2019bt.pdf" target="_blank" rel="noreferrer">PP Nomor 80 Tahun 2019</a>. Pengelola meninjau kebijakan ini jika ketentuan resmi berubah.</p>
      </section>
    </PolicyPage>
  );
}
