import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), ".local-uploads", "question-images");

export class InvalidQuestionImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQuestionImageError";
  }
}

export class QuestionImageStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionImageStorageConfigurationError";
  }
}

const IMAGE_TYPES = {
  png: { contentType: "image/png", extension: "png" },
  jpeg: { contentType: "image/jpeg", extension: "jpg" },
  webp: { contentType: "image/webp", extension: "webp" },
} as const;

type ImageType = (typeof IMAGE_TYPES)[keyof typeof IMAGE_TYPES];

let s3Client: S3Client | undefined;

function getImageType(bytes: Buffer): ImageType | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return IMAGE_TYPES.png;
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return IMAGE_TYPES.jpeg;
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return IMAGE_TYPES.webp;
  }

  return null;
}

function usesLocalStorage() {
  return process.env.NODE_ENV === "development" && !process.env.QUESTION_IMAGE_S3_BUCKET;
}

function getS3Config() {
  const bucket = process.env.QUESTION_IMAGE_S3_BUCKET?.trim();
  const accessKeyId = process.env.QUESTION_IMAGE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.QUESTION_IMAGE_S3_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new QuestionImageStorageConfigurationError(
      "Penyimpanan gambar belum dikonfigurasi. Isi kredensial S3-compatible di environment hosting.",
    );
  }

  const endpointValue = process.env.QUESTION_IMAGE_S3_ENDPOINT?.trim();
  if (endpointValue) {
    try {
      const endpoint = new URL(endpointValue);
      if (
        !["http:", "https:"].includes(endpoint.protocol) ||
        endpoint.username ||
        endpoint.password ||
        (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:")
      ) {
        throw new Error("invalid endpoint");
      }
    } catch {
      throw new QuestionImageStorageConfigurationError(
        "Endpoint penyimpanan gambar harus URL HTTP(S) yang valid dan menggunakan HTTPS di production.",
      );
    }
  }

  return {
    bucket,
    endpoint: endpointValue || undefined,
    region: process.env.QUESTION_IMAGE_S3_REGION?.trim() || "us-east-1",
    accessKeyId,
    secretAccessKey,
  };
}

function getS3Client(config: ReturnType<typeof getS3Config>) {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return s3Client;
}

function localFilePath(packageId: number, filename: string) {
  return path.join(LOCAL_UPLOADS_DIR, String(packageId), filename);
}

export async function storeQuestionImage(packageId: number, file: File) {
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new InvalidQuestionImageError("Ukuran gambar maksimal 4 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const imageType = getImageType(bytes);
  if (!imageType) {
    throw new InvalidQuestionImageError("Format gambar harus PNG, JPG, atau WebP yang valid.");
  }

  const filename = `${randomUUID()}.${imageType.extension}`;
  const key = `question-images/${packageId}/${filename}`;

  if (usesLocalStorage()) {
    const destination = localFilePath(packageId, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
  } else {
    const config = getS3Config();
    await getS3Client(config).send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentLength: bytes.byteLength,
      ContentType: imageType.contentType,
      CacheControl: "private, max-age=300",
    }));
  }

  return {
    imageUrl: `/api/question-images/${packageId}/${filename}`,
    contentType: imageType.contentType,
  };
}

export async function readQuestionImage(packageId: number, filename: string) {
  if (usesLocalStorage()) {
    const bytes = await readFile(localFilePath(packageId, filename));
    const extension = path.extname(filename).toLowerCase();
    const contentType = extension === ".png"
      ? IMAGE_TYPES.png.contentType
      : extension === ".webp"
        ? IMAGE_TYPES.webp.contentType
        : IMAGE_TYPES.jpeg.contentType;

    return { bytes, contentType };
  }

  const config = getS3Config();
  const result = await getS3Client(config).send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: `question-images/${packageId}/${filename}`,
  }));

  if (!result.Body) {
    throw new Error("Gambar tidak ditemukan.");
  }

  return {
    bytes: Buffer.from(await result.Body.transformToByteArray()),
    contentType: result.ContentType ?? "application/octet-stream",
  };
}

export function isQuestionImageNotFound(error: unknown) {
  if (!(error instanceof Error)) return false;

  const storageError = error as Error & {
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return error.name === "NoSuchKey" ||
    error.name === "NotFound" ||
    storageError.code === "ENOENT" ||
    storageError.$metadata?.httpStatusCode === 404;
}
