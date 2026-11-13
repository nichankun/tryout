# Panduan Operasi Produksi ASNPedia

Gunakan panduan ini sebelum membuka pendaftaran atau menerima pembayaran pelanggan.

## 1. Environment hosting

Isi secret di dashboard hosting, bukan di source code atau commit Git. Salin daftar variabel dari `.env.example` dan setidaknya lengkapi:

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, dan `AUTH_CLIENT_IP_HEADER`.
- Kredensial Google OAuth yang memakai callback URL domain produksi.
- `RESEND_API_KEY` dan `RESEND_FROM_EMAIL` dari domain email yang sudah diverifikasi.
- `BUSINESS_LEGAL_NAME`, `BUSINESS_CONTACT_ADDRESS`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `POLICY_EFFECTIVE_DATE`.
- Kunci Midtrans produksi dan `MIDTRANS_IS_PRODUCTION=true` sebelum menerima transaksi nyata.
- `CRON_SECRET` acak minimal 32 byte untuk melindungi job rekonsiliasi pembayaran.
- Bucket S3-compatible, region, endpoint bila penyedia memerlukannya, dan access key khusus aplikasi.

Jalankan `pnpm preflight:production` pada environment produksi setelah secret dimasukkan. Pemeriksaan ini memeriksa nama variabel, URL, dan format dasar. Ia tidak menghubungi PostgreSQL, Google, Resend, Midtrans, atau S3 untuk membuktikan credential berfungsi.

Untuk membuat secret rekonsiliasi, jalankan `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` secara lokal, lalu simpan hasilnya sebagai secret `CRON_SECRET` di Dokploy. Jangan menyimpan hasilnya di repository atau menaruhnya langsung pada command job.

## Pembayaran Midtrans

1. Atur `MIDTRANS_IS_PRODUCTION=true`, lalu simpan Server Key dan Client Key Production di secret Dokploy.
2. Di Midtrans Dashboard, set **Payment Notification URL** ke `https://<domain-produksi>/api/webhook`. Endpoint harus HTTPS dan dapat diakses dari internet publik tanpa login, Basic Auth, VPN, atau header rahasia tambahan.
3. Tambahkan **Application Job** di Dokploy untuk service aplikasi. Jalankan setiap lima menit dengan cron `*/5 * * * *` dan command berikut:

   ```sh
   node -e "fetch(new URL('/api/cron/payments/reconcile',process.env.NEXT_PUBLIC_APP_URL),{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET},signal:AbortSignal.timeout(180000)}).then(async r=>{const body=await r.text();console.log(body);if(!r.ok)process.exitCode=1}).catch(e=>{console.error(e.name);process.exitCode=1})"
   ```

   Job memakai `NEXT_PUBLIC_APP_URL` dan `CRON_SECRET` dari environment service. Jalankan sekali secara manual setelah deploy, pastikan respons berisi `success: true`, lalu periksa log schedule Dokploy secara berkala.
4. Jalankan migration yang menambah data refund, penanda pembayaran ganda, status rekonsiliasi, dan index pembayaran dengan alur bagian database di bawah sebelum membuka checkout.
5. Lakukan transaksi bernilai kecil setelah Midtrans menyetujui akun Production. Pastikan notifikasi sukses terlihat di Midtrans, order menjadi lunas, dan akses paket terbuka. Uji satu transaksi gagal/kedaluwarsa dan satu refund melalui Dashboard sebelum membuka pembayaran untuk semua pelanggan.

Job rekonsiliasi menanyakan status order pending langsung ke Midtrans, membatalkan order pending lama yang duplikat, dan menutup Snap session yang sudah kedaluwarsa. Order yang masih berstatus gagal di aplikasi tetapi masih pending di Midtrans tetap ditandai untuk sinkronisasi dan terus dipantau sampai status penyedia terminal. Checkout hanya menggunakan satu order aktif per akun dan paket. Bila Midtrans menyatakan pembayaran sedang berlangsung atau statusnya belum dapat dipastikan, checkout menahan pembuatan order baru.

Status refund penuh dan chargeback menghentikan akses paket; refund sebagian tetap memberi akses dan mengurangi nilai pendapatan bersih. Order yang berhasil dibayar lebih dari sekali ditandai **DUPLIKAT · PERLU DICEK** pada daftar transaksi admin. Refund tidak dikirim otomatis oleh aplikasi; periksa order tersebut dan proses pengembalian melalui Midtrans Dashboard agar keputusan finansial tetap ditinjau pengelola. Refund Midtrans hanya tersedia untuk metode tertentu; untuk metode lain atau transaksi di luar periode refund, pengembalian dana perlu dilakukan langsung oleh merchant kepada pelanggan. Lihat [kebijakan refund Midtrans](https://docs.midtrans.com/docs/how-can-i-refund-transaction) sebelum memprosesnya.

Jangan mengaktifkan pendaftaran publik sampai identitas pengelola, alamat kontak, kontak bantuan, tanggal kebijakan, dan halaman kebijakan sudah ditinjau serta diisi dengan data sebenarnya.

## 2. Database dan rilis

1. Buat backup sebelum perubahan schema.
2. Tinjau migration baru di `drizzle/`. Migration Better Auth menambahkan tabel, menyalin hash bcrypt, status verifikasi email, dan identitas akun Google dari tabel lama, serta mempertahankan tabel Auth.js yang lama.
3. Terapkan migration ke database staging dan pastikan pengguna lama masih dapat login. Sesi Auth.js lama tidak terbawa, jadi semua pengguna perlu login kembali setelah cutover.
4. Jalankan `pnpm db:check`, lalu `pnpm db:migrate` terhadap database target rilis.
5. Deploy build yang sama dengan migration tersebut dan jalankan smoke check pada staging.
6. Jangan memakai `drizzle-kit push` sebagai workflow production.

Sediakan backup PostgreSQL otomatis, terenkripsi, dan terpisah dari database utama. Tetapkan retensi sesuai kebutuhan bisnis dan kewajiban hukum; uji pemulihan backup ke database staging secara berkala. Backup yang belum pernah diuji pemulihannya belum membuktikan pemulihan dapat dilakukan.

## 3. Penyimpanan gambar soal

- Gunakan bucket private; aplikasi membaca gambar melalui endpoint server `/api/question-images/...`.
- Buat access key terpisah dengan hak minimum untuk membaca dan menulis hanya pada prefix `question-images/`.
- Wajibkan HTTPS untuk endpoint S3-compatible dan enkripsi objek saat tersimpan.
- Jangan memasukkan access key ke URL browser, source code, atau log.
- Uji unggah, baca kembali, format PNG/JPG/WebP, dan penolakan file di atas 4 MB pada staging.
- Simpan credential S3 di secret manager hosting. Bucket bukan tempat menyimpan backup database kecuali dibuat alur backup terpisah dengan credential dan kebijakan akses tersendiri.

## 4. Email, proxy, dan rate limit

- Verifikasi domain pengirim email pada Resend dan atur SPF/DKIM sesuai instruksi penyedia; pantau bounce dan keluhan spam.
- Isi `AUTH_CLIENT_IP_HEADER` dengan satu header IP yang diisi ulang oleh reverse proxy hosting. Nilai tersebut dipakai oleh Better Auth dan pembatasan percobaan server-side; jangan pilih header yang dapat diteruskan tanpa validasi dari pengunjung.
- Batasi akses dashboard hosting dan secret ke orang yang membutuhkannya. Siapkan rotasi `AUTH_SECRET`, Google OAuth, Resend, Midtrans, dan S3 bila credential bocor.
- Rate limit aplikasi tersimpan pada PostgreSQL. Pantau respons `429`, kegagalan akses tabel `rate_limit_buckets`, dan error database. Jika penyimpanan rate limit gagal di production, endpoint terkait menolak sementara permintaan baru.
- Tabel rate limit dibersihkan otomatis untuk data yang lebih lama dari 24 jam. Catatan audit admin tidak menyimpan kata sandi atau isi soal; tetapkan masa simpan audit sesuai kebijakan operasional dan hukum yang berlaku.

## 5. Monitoring dan respons gangguan

Endpoint `GET /api/health` memeriksa aplikasi dan koneksi PostgreSQL serta mengembalikan `503` bila database tidak tersedia. Gunakan sebagai health probe hosting. Endpoint ini tidak memeriksa Midtrans, Resend, atau S3.

Pantau setidaknya error HTTP 5xx, latensi, koneksi PostgreSQL, callback pembayaran, pengiriman email, kegagalan baca/tulis bucket, serta lonjakan 429. Buat notifikasi untuk error server berulang dan database/storage yang tidak tersedia.

Simpan log server di layanan monitoring hosting dengan akses terbatas. Hindari merekam password, token reset/verifikasi, authorization header, connection string, atau isi credential. Untuk laporan pengguna, minta ID pesanan atau waktu kejadian; jangan meminta OTP, PIN, CVV, atau kata sandi.

## 6. Kepatuhan dan kebijakan publik

Halaman kebijakan saat ini adalah draf operasional sampai identitas dan kontak pemilik dilengkapi. Periksa isi akhir dengan penasihat yang memahami bentuk usaha dan alur data sebenarnya sebelum dipublikasikan. PP 80/2019 memuat kewajiban penyimpanan dokumen transaksi keuangan PMSE selama 10 tahun dan dokumen PMSE lain selama 5 tahun, serta persyaratan layanan pengaduan; terapkan pada klasifikasi data dan proses retensi yang benar.

- [PP 80 Tahun 2019, JDIH Peraturan.go.id](https://peraturan.go.id/files/pp80-2019bt.pdf)
- [UU 27 Tahun 2022 tentang Pelindungan Data Pribadi, JDIH BPK](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)

Pernyataan kebijakan harus tetap sesuai dengan layanan dan penyedia yang benar-benar digunakan. Jangan menyatakan sertifikasi, kepatuhan, SLA, atau praktik keamanan yang belum dibuktikan.
