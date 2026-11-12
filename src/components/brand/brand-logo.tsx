import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  tone?: "default" | "inverse";
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Image
      src="/asnpedia-mark.svg"
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      className={cn("size-10 shrink-0", className)}
    />
  );
}

export function BrandLogo({
  className,
  markClassName,
  textClassName,
  tone = "default",
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span
        className={cn(
          "font-extrabold leading-none tracking-tight",
          tone === "inverse" ? "text-white" : "text-purple-950",
          textClassName,
        )}
      >
        ASN
        <span className={tone === "inverse" ? "text-violet-200" : "text-primary"}>
          Pedia
        </span>
      </span>
    </span>
  );
}
