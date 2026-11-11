"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestionImageUploadProps {
  packageId: number;
  label: string;
  value?: string | null;
  altText?: string | null;
  aspect?: "wide" | "square";
  onChange: (imageUrl: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

function isUploadResponse(value: unknown): value is { imageUrl: string; error?: string } {
  return typeof value === "object" && value !== null && "imageUrl" in value &&
    typeof value.imageUrl === "string";
}

function getUploadError(value: unknown) {
  if (typeof value === "object" && value !== null && "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return "Gambar gagal diunggah. Coba lagi.";
}

export function QuestionImageUpload({
  packageId,
  label,
  value,
  altText,
  aspect = "wide",
  onChange,
  onUploadingChange,
}: QuestionImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const preview = localPreview ?? value ?? null;

  React.useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const upload = async (file: File) => {
    setError(null);

    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Pilih gambar PNG, JPG, atau WebP.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 4 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("packageId", String(packageId));

      const response = await fetch("/api/admin/question-images", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();

      if (!response.ok || !isUploadResponse(result)) {
        throw new Error(getUploadError(result));
      }

      onChange(result.imageUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gambar gagal diunggah. Coba lagi.");
    } finally {
      setLocalPreview(null);
      setIsUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isUploading) return;
    const file = event.dataTransfer.files[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="rounded-xl border border-dashed border-border bg-muted/20 p-3"
      >
        {preview ? (
          <div className={`relative w-full overflow-hidden rounded-lg border border-border bg-white ${aspect === "square" ? "aspect-square max-w-56" : "aspect-[16/9]"}`}>
            <Image
              src={preview}
              alt={altText || label}
              fill
              unoptimized
              sizes={aspect === "square" ? "224px" : "(max-width: 640px) 100vw, 640px"}
              className="object-contain p-2"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/75 text-sm font-medium text-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden />
                Mengunggah gambar…
              </div>
            )}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center gap-2 rounded-lg bg-background/70 px-4 text-center ${aspect === "square" ? "aspect-square max-w-56" : "aspect-[16/9]"}`}>
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ImagePlus className="size-5" aria-hidden />
            </div>
            <p className="text-xs text-muted-foreground">Seret gambar ke sini atau pilih dari perangkat.</p>
            <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP · maksimal 4 MB</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={`Unggah ${label.toLowerCase()}`}
            disabled={isUploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            {value ? "Ganti gambar" : "Pilih gambar"}
          </Button>
          {value && !isUploading && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <Trash2 aria-hidden />
              Hapus
            </Button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
