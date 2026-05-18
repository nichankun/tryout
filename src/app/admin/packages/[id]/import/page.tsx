"use client";

/**
 * app/admin/packages/[id]/import/page.tsx
 * * Client Component Manajemen Dashboard Pengunggahan Bank Soal Massal (.JSON).
 * Sudah diperbaiki dari deprecation FormEvent dan dijamin Type-Safe dari string | undefined.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { importBulkQuestionsAction } from "@/lib/actions/questions";
import { ArrowLeft, UploadCloud, AlertCircle, CheckCircle2, Loader2, FileJson } from "lucide-react";
import Link from "next/link";

export default function ImportQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const [isPending, setIsPending] = React.useTransition();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mengonversi ID parameter dengan validasi string aman
  const rawId = typeof params.id === "string" ? params.id : "";
  const packageId = parseInt(rawId, 10) || 0;

  // Handler mendeteksi pergantian file pada tag input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith(".json")) {
        setStatus({ type: "error", text: "Format file wajib berupa ekstensi .json" });
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setStatus(null);
    }
  };

  // Eksekusi pembacaan isi file JSON dan kirim ke Server Action
  // ✅ FIX 1: Menambahkan tipe generik <HTMLFormElement> untuk menghindari deprecation warning
  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: "error", text: "Silakan pilih file format JSON terlebih dahulu." });
      return;
    }

    setStatus(null);
    
    setIsPending(() => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const jsonText = event.target?.result as string;
          const parsedData = JSON.parse(jsonText);

          // Tembak data array murni ke Server Action
          const result = await importBulkQuestionsAction(packageId, parsedData);

          // ✅ FIX 2: Memberikan fallback string jika result.error bernilai undefined
          if (!result.success) {
            setStatus({ 
              type: "error", 
              text: result.error ?? "Gagal mengimpor soal karena terjadi kesalahan tidak dikenal." 
            });
            return;
          }

          setStatus({ 
            type: "success", 
            text: `Berhasil mengimpor massal ${result.totalImported} butir soal ke dalam paket ini!` 
          });
          setFile(null);
          
          // Beri jeda 1.5 detik agar admin bisa membaca sebelum redirect
          setTimeout(() => {
            router.push(`/admin/packages/${packageId}`);
          }, 1500);

        } catch {
          setStatus({ type: "error", text: "Gagal membaca file. Pastikan struktur sintaksis JSON Anda tidak rusak (no syntax error)." });
        }
      };

      reader.readAsText(file);
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 text-foreground antialiased">
      
      {/* HEADER NAVIGASI */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/admin/packages/${packageId}`}
          className="p-2 border border-border bg-card rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Import Soal Massal</h1>
          <p className="text-xs text-muted-foreground">Unggah ratusan butir materi tryout sekaligus via dokumen JSON ke Volume {packageId}</p>
        </div>
      </div>

      {/* BANNER NOTIFIKASI FEEDBACK */}
      {status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          status.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
            : "bg-destructive/10 border-destructive/20 text-destructive"
        }`}>
          {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{status.text}</span>
        </div>
      )}

      {/* FORM AREA DROPZONE UPLOAD */}
      <form onSubmit={handleUploadSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/20 hover:bg-muted/30 transition-colors relative flex flex-col items-center justify-center min-h-56">
            <input 
              type="file" 
              accept=".json"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={isPending}
            />
            
            {file ? (
              <div className="space-y-3 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 bg-primary/10 text-primary rounded-full">
                  <FileJson className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                <div className="p-4 bg-muted border border-border rounded-full text-muted-foreground">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Klik atau seret file JSON Anda ke sini</p>
                  <p className="text-xs text-muted-foreground">Pastikan ekstensi file diakhiri dengan tipe .json resmi</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTROLS BUTTON GROUP */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/admin/packages/${packageId}`}
            className="h-11 px-5 border border-border bg-card font-medium rounded-xl text-sm flex items-center justify-center hover:bg-muted transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={!file || isPending}
            className="h-11 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses Bulk Insert...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Mulai Import Sekarang
              </>
            )}
          </button>
        </div>
      </form>

      {/* SKIN/TEMPLATE TEKS PANDUAN STRUKTUR JSON */}
      <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contoh Cetak Struktur Format File JSON yang Valid:</h3>
        <pre className="text-[11px] font-mono p-3 bg-background border border-border rounded-lg overflow-x-auto text-muted-foreground leading-relaxed">
{`[
  {
    "kategori": "TWK",
    "pertanyaan": "Lambang Negara Indonesia adalah Garuda Pancasila dengan semboyan Bhinneka Tunggal Ika. Pengaturan lambang negara ini diatur secara resmi dalam...",
    "pembahasan": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 Pasal 36A menegaskan Lambang Negara ialah Garuda Pancasila.",
    "pilihan": [
      { "opsi": "A", "teks": "UU No. 24 Tahun 2009", "poin": 5 },
      { "opsi": "B", "teks": "UU No. 12 Tahun 2011", "poin": 0 },
      { "opsi": "C", "teks": "UU No. 17 Tahun 2014", "poin": 0 },
      { "opsi": "D", "teks": "UU No. 23 Tahun 2014", "poin": 0 },
      { "opsi": "E", "teks": "UU No. 30 Tahun 2014", "poin": 0 }
    ]
  }
]`}
        </pre>
      </div>

    </div>
  );
}