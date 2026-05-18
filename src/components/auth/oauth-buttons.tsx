"use client";

/**
 * components/auth/oauth-buttons.tsx
 */

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const OAUTH_CONFIG = {
  providers: {
    google: "google",
  },
  defaultCallbackUrl: "/dashboard",
} as const;

const TEXT_CONTENT = {
  google: {
    login: "Masuk dengan Google",
    register: "Daftar dengan Google",
    loading: "Menghubungkan...",
  },
  errors: {
    connection: "Gagal terhubung ke Google. Coba lagi.",
  },
} as const;

// ==========================================
// TIPE PROPS
// ==========================================
interface OAuthButtonsProps {
  mode: "login" | "register";
  // Terima callbackUrl dari parent agar konsisten dengan LoginForm
  callbackUrl?: string;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function OAuthButtons({
  mode,
  callbackUrl = OAUTH_CONFIG.defaultCallbackUrl,
}: OAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText =
    mode === "login" ? TEXT_CONTENT.google.login : TEXT_CONTENT.google.register;

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);
      setError(null);
      await signIn(OAUTH_CONFIG.providers.google, { callbackUrl });
    } catch {
      setError(TEXT_CONTENT.errors.connection);
      setIsLoading(false); // Pastikan loading dimatikan jika error
    }
  }

  return (
    <div className="space-y-3">
      
      {/* PESAN ERROR GLOBAL (Selaras dengan LoginForm) */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* TOMBOL OAUTH */}
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        className="w-full font-semibold h-11 rounded-xl gap-2.5"
        onClick={handleGoogleSignIn}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            {TEXT_CONTENT.google.loading}
          </>
        ) : (
          <>
            <GoogleIcon />
            {buttonText}
          </>
        )}
      </Button>
    </div>
  );
}

// ==========================================
// KOMPONEN IKON
// ==========================================
function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}