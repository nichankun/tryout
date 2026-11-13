import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const publicPaths = [
  "/",
  "/bantuan",
  "/kebijakan-privasi",
  "/kebijakan-refund",
  "/syarat-ketentuan",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
