# ASNPedia Tryout

Platform latihan tryout SKD dengan akun peserta, katalog paket, checkout Midtrans, sesi ujian bertimer, hasil, dan pembahasan.

## Menjalankan lokal

Gunakan Node.js yang kompatibel dengan Next.js 16 dan pnpm.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Isi variabel yang diperlukan di `.env`, lalu siapkan PostgreSQL. Untuk database baru yang kosong, buat dan periksa migration terlebih dahulu, kemudian terapkan:

```powershell
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Untuk database baru yang kosong, jangan jalankan baseline; `pnpm db:migrate` menerapkan seluruh migration dari awal. Untuk database lama yang cocok dengan skema awal project tetapi belum punya riwayat Drizzle, jalankan `pnpm db:baseline` satu kali. Perintah itu membandingkan tabel, kolom, tipe, nullability, default, key, foreign key, dan index; ia berhenti tanpa perubahan bila ada ketidakcocokan. Setelah baseline berhasil, jalankan `pnpm db:migrate`. Jangan baseline database dengan skema berbeda sebelum selisihnya ditinjau.

## Variabel lingkungan

Salin nama variabel dari `.env.example`. Jangan commit `.env` atau memasukkan nilai secret ke source code.

## Migrasi autentikasi ke Better Auth

Migration `0005_faithful_mother_askani.sql` menambahkan tabel Better Auth dan memindahkan hash kata sandi bcrypt serta akun Google yang sudah ada ke tabel akun baru. Migration ini juga menyalin status verifikasi email lama, mempertahankan tabel Auth.js lama, dan tidak menghapus data akun. Hash bcrypt lama diverifikasi saat login pertama lalu dinaikkan ke scrypt; sesi lama tidak dapat dipakai setelah pergantian, jadi pengguna perlu masuk kembali. Tautan verifikasi/reset lama yang masih berlaku tetap ditangani selama masa transisi.

Untuk production, buat backup database dan tinjau migration sebelum menerapkannya. Terapkan migration aditif ke database target terlebih dahulu (`pnpm db:migrate`), baru deploy kode Better Auth. Isi `BETTER_AUTH_SECRET` dan `BETTER_AUTH_URL`; nama lama `AUTH_SECRET` dan `AUTH_URL` hanya fallback sementara. Setelah deploy, uji login email, verifikasi email, reset kata sandi, login Google, logout, dan pencabutan sesi di staging dengan akun uji. Jangan jalankan migration terhadap database production sebelum backup dan pemeriksaan skema target.

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret Better Auth acak minimal 32 byte; jangan digunakan ulang untuk layanan lain |
| `BETTER_AUTH_URL` | Origin aplikasi HTTPS, misalnya `https://domain-anda` |
| `AUTH_SECRET`, `AUTH_URL` | Nama lama yang sementara masih dibaca sebagai fallback; pindahkan ke variabel Better Auth sebelum deploy |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Kredensial OAuth Google |
| `AUTH_CLIENT_IP_HEADER` | Header IP pengunjung yang ditetapkan ulang oleh proxy hosting; diperlukan untuk pembatasan percobaan per IP |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans, hanya di server |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Client key Midtrans, digunakan Snap.js di browser |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox, `true` untuk production |
| `RESEND_API_KEY` | API key email untuk verifikasi dan reset password |
| `RESEND_FROM_EMAIL` | Alamat pengirim pada domain yang diverifikasi di Resend |
| `NEXT_PUBLIC_APP_URL` | URL publik untuk tautan verifikasi dan reset password |
| `BUSINESS_LEGAL_NAME` | Nama pemilik/badan usaha pada draft kebijakan |
| `SUPPORT_EMAIL` | Alamat bantuan pelanggan pada halaman kebijakan |
| `QUESTION_IMAGE_S3_ENDPOINT` | Endpoint S3-compatible object storage; kosongkan untuk AWS S3 |
| `QUESTION_IMAGE_S3_REGION` | Region bucket; gunakan `auto` untuk Cloudflare R2 |
| `QUESTION_IMAGE_S3_BUCKET` | Nama bucket privat untuk gambar soal |
| `QUESTION_IMAGE_S3_ACCESS_KEY_ID`, `QUESTION_IMAGE_S3_SECRET_ACCESS_KEY` | Kredensial server untuk mengunggah dan membaca gambar |

Saat development lokal, gambar otomatis disimpan di `.local-uploads/`. Di production, siapkan bucket S3-compatible privat dan isi semua variabel S3 di atas. File peserta disajikan lewat route aplikasi yang memeriksa login dan akses paket; jangan jadikan bucket publik. Gunakan endpoint publik hanya melalui route aplikasi, jangan menyimpan kredensial storage di browser. Batasi kredensial storage ke operasi baca/tulis pada prefix `question-images/`. Upload menerima PNG, JPG, dan WebP yang tervalidasi dengan batas 4 MB per gambar.

## Menyiapkan akses admin dan konten

1. Daftarkan akun admin pertama dan verifikasi alamat email.
2. Promosikan akun tersebut melalui koneksi database yang aman, dengan mengganti alamat email contoh:

   ```sql
   UPDATE "user" SET role = 'ADMIN' WHERE email = 'admin@domain-anda';
   ```

3. Login, buat paket di `/admin/packages`, lalu masukkan bank soal melalui fitur impor JSON.
4. Pastikan paket memiliki soal sebelum mengaktifkannya untuk pembeli.

Role dibaca ulang dari database pada halaman admin dan setiap aksi admin. Jangan memberi role admin melalui data profil/session yang dikirim browser.

## Deploy

Aplikasi memakai Next.js server runtime dan PostgreSQL; jangan deploy sebagai static export. Pada hosting Node.js, gunakan:

- Build command: `pnpm build`
- Start command: `pnpm start`
- Periksa tabel riwayat migration dan skema database target sebelum menjalankan migration. Untuk database baru yang kosong, `pnpm db:migrate` membuat skema dan menambah kolom gambar. Database yang sudah berisi data harus di-baseline sesuai riwayatnya dahulu; jangan menjalankan migration bootstrap secara langsung.
- Simpan semua variabel lingkungan di pengaturan rahasia hosting. Gunakan database managed yang menyediakan SSL, backup otomatis, dan pemulihan yang sudah dicoba.
- Set `BETTER_AUTH_URL` dan `NEXT_PUBLIC_APP_URL` ke origin HTTPS publik yang sama. `BETTER_AUTH_SECRET` harus acak dan minimal 32 byte. Origin ini dipakai untuk sesi, callback OAuth, tautan email, dan perlindungan CSRF endpoint unggah gambar.
- Siapkan bucket S3-compatible privat untuk gambar soal. Set `QUESTION_IMAGE_S3_ENDPOINT`, `QUESTION_IMAGE_S3_REGION`, `QUESTION_IMAGE_S3_BUCKET`, `QUESTION_IMAGE_S3_ACCESS_KEY_ID`, dan `QUESTION_IMAGE_S3_SECRET_ACCESS_KEY` di secret hosting sebelum admin mengunggah gambar. Endpoint custom wajib memakai HTTPS di production.

Konfigurasikan OAuth Google dengan callback `https://domain-anda/api/auth/callback/google`. Atur URL notifikasi Midtrans ke `https://domain-anda/api/webhook`, dan gunakan Client Key serta Server Key dari lingkungan yang sama. Untuk sandbox, uji notifikasi pending, settlement, expire, notifikasi berulang, dan nominal yang tidak cocok sebelum beralih ke production.

Verifikasi domain pengirim email pada Resend dan konfigurasi DNS yang diminta provider. Pastikan tautan email mengarah ke domain HTTPS produksi melalui `NEXT_PUBLIC_APP_URL`.

## Sebelum penjualan dibuka

- Isi identitas pemilik/badan usaha, email bantuan, tanggal berlaku, masa retensi data, dan keputusan refund pada halaman kebijakan. Halaman saat ini memang ditandai sebagai draf.
- Periksa bahwa konten soal memiliki hak penggunaan dan bahwa jumlah soal, biaya, durasi, dan isi paket sesuai yang ditampilkan saat checkout.
- Pastikan akun admin menggunakan kata sandi unik dan batasi akses database produksi.
- Siapkan pemantauan error, rekonsiliasi transaksi, prosedur bantuan untuk pembayaran berhasil tanpa akses, backup, dan latihan pemulihan database.
- Verifikasi alur pendaftaran/email, login Google, pembayaran sandbox sampai akses terbuka, pembayaran gagal/kedaluwarsa, sesi ujian yang tetap tersimpan setelah reload, serta pembatasan akses antar akun.
- Jangan menyebut ASNPedia sebagai layanan resmi atau afiliasi BKN. Target nilai di aplikasi adalah target latihan dan bukan penetapan seleksi resmi.

## Perintah project

```powershell
pnpm dev
pnpm lint
pnpm build
pnpm db:generate
pnpm db:baseline
pnpm db:migrate
pnpm db:check
```
