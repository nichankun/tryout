"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAllPackageQuestionsAction } from "@/lib/actions/questions";

interface DeleteAllQuestionsButtonProps {
  packageId: number;
  packageTitle: string;
  questionCount: number;
}

export function DeleteAllQuestionsButton({
  packageId,
  packageTitle,
  questionCount,
}: DeleteAllQuestionsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAllPackageQuestionsAction(packageId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          disabled={questionCount === 0 || isPending}
          className="gap-2 rounded-xl"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Hapus Semua Soal
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus semua soal?</AlertDialogTitle>
          <AlertDialogDescription>
            Sebanyak{" "}
            <span className="font-semibold text-foreground">
              {questionCount.toLocaleString("id-ID")}
            </span>{" "}
            soal dari <span className="font-semibold text-foreground">“{packageTitle}”</span> akan
            dihapus permanen. Peserta tidak dapat mengerjakan paket sampai soal ditambahkan
            kembali. Jawaban per soal yang tersimpan akan ikut terhapus; skor ringkasan riwayat
            tetap ada, tetapi pembahasan soal yang dihapus tidak lagi tersedia.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Menghapus…
              </>
            ) : (
              <>Hapus {questionCount.toLocaleString("id-ID")} Soal</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
