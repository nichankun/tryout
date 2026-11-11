# Checklist QA Rilis

Gunakan staging dengan database dan credential sandbox. Jangan menguji transaksi berbayar dengan kunci produksi.

## Pemeriksaan otomatis

- [ ] `pnpm lint`
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build`
- [ ] `pnpm db:check`
- [ ] `pnpm preflight:production` pada environment hosting setelah secret diisi.
- [ ] `pnpm db:migrate` sudah berhasil pada database staging.

## Pengguna dan sesi latihan

- [ ] Daftar, verifikasi email, login, lupa kata sandi, dan reset kata sandi berhasil; pesan tidak membocorkan apakah email terdaftar.
- [ ] Akun tanpa akses tidak dapat membuka paket berbayar atau mengambil soal melalui API.
- [ ] Mulai latihan membuat satu sesi; refresh atau membuka ulang halaman memulihkan sesi aktif yang sama.
- [ ] Jawaban dan penanda ragu tersimpan setelah berpindah soal dan setelah refresh.
- [ ] Menutup tab, offline sementara, atau memuat ulang tidak mengakhiri sesi lebih cepat. Timer mengikuti `expiresAt` server.
- [ ] Sesi yang kedaluwarsa ditolak server dan hasil akhir hanya tersimpan satu kali.
- [ ] Uji dua tab pada akun/paket yang sama dan pastikan perilakunya dapat dipahami pengguna.
- [ ] Respons 429 dan gangguan jaringan menampilkan pesan yang bisa dipulihkan, bukan menyelesaikan ujian secara diam-diam.

## Admin dan konten

- [ ] Akun biasa tidak dapat membuka halaman atau aksi admin.
- [ ] Admin dapat membuat, mengubah, impor, dan menghapus paket/soal; log aktivitas mencatat tindakan berhasil.
- [ ] Uji gambar soal PNG, JPG, WebP, file rusak, dan file lebih dari 4 MB.
- [ ] Gambar dapat dibaca setelah deploy ulang aplikasi; bucket tetap private.
- [ ] Cek tampilan pada lebar 360 px, 768 px, dan desktop; sidebar, formulir, tabel, timer, navigator soal, dan dialog tidak menutupi aksi utama.
- [ ] Uji navigasi keyboard, fokus yang terlihat, label input, kontras teks, dan pesan validasi.

## Koneksi dan observabilitas

- [ ] Simulasikan koneksi lambat dan putus-sambung saat menjawab; setelah online, jawaban tersimpan tanpa membuat sesi baru.
- [ ] Pastikan error 5xx, 429, email gagal, koneksi database putus, serta S3 tidak tersedia tercatat di monitoring tanpa membocorkan secret.
- [ ] Pastikan backup staging berhasil dipulihkan ke database terpisah.
- [ ] Periksa email di Gmail dan mobile: link verifikasi/reset menuju domain staging yang benar.
- [ ] Setelah deploy staging, buka ulang alur utama melalui browser dari awal, bukan hanya hot reload.

Catat tanggal, versi commit/build, perangkat/browser, hasil tiap skenario, dan defect yang ditemukan. Tunda rilis jika alur mulai/simpan/submit sesi atau hak akses admin gagal.
