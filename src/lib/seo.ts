import type { Metadata } from "next";

export const SITE_URL = "https://asnpedia.kelonika.my.id";
export const SITE_NAME = "ASNPedia";
export const SOCIAL_IMAGE_PATH = "/opengraph-image";

interface PublicPageMetadataInput {
  title: string;
  description: string;
  path: string;
}

export function createPublicPageMetadata({
  title,
  description,
  path,
}: PublicPageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images: [
        {
          url: SOCIAL_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: "ASNPedia — Tryout dan latihan SKD CPNS",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [SOCIAL_IMAGE_PATH],
    },
  };
}
