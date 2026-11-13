import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  jsonb,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==========================================
// KONSTANTA ENUM & TYPE DEFINITIONS
// ==========================================
export const USER_ROLES = ["USER", "ADMIN"] as const;
export const ORDER_STATUSES = ["pending", "paid", "failed", "partially_refunded", "refunded", "disputed"] as const;
export const QUESTION_CATEGORIES = ["TWK", "TIU", "TKP"] as const;
export const TRYOUT_ATTEMPT_STATUSES = ["in_progress", "expired", "completed"] as const;

// Kolom lama ini dipertahankan agar migration tidak menghapus konfigurasi
// figural yang masih tersimpan. UI dan renderer generator sudah dihentikan.
export interface LegacyFiguralConfig {
  // PERBAIKAN 1: Tambahkan "silogisme" di akhir daftar tipe
  tipe: "deret_rotasi" | "matriks" | "pencerminan" | "analogi_gambar" | "analogi_matriks" | "ketidaksamaan" | "deret_bangun" | "tumpukan_balok" | "silogisme";
  deretSoal: (string | number)[];
}

export interface QuestionChoice {
  opsi: string; // misal: "A", "B", "C", "D", "E"
  teks: string;
  poin: number; // TKP punya poin 1-5, TIU/TWK 0 atau 5
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface StudentAnswer {
  questionId: number;
  jawaban: string | null; // null jika tidak dijawab
  poinSiswa: number;
}

// ── 1. USERS ──────────────────────────────────────────────────────────────
export const users = pgTable("user", {
  id:            uuid("id").defaultRandom().primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("auth_email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("emailVerified", { mode: "date" }),
  image:         text("image"),
  passwordHash:  text("password_hash"),
  role:          text("role", { enum: USER_ROLES }).notNull().default("USER"),
  createdAt:     timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// Better Auth core tables. These are additive so existing Auth.js tables and
// their data remain available while the application moves to the new session format.
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
  }),
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("auth_accounts_provider_account_idx").on(table.providerId, table.accountId),
    userIdIdx: index("auth_accounts_user_id_idx").on(table.userId),
  }),
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("auth_verifications_identifier_idx").on(table.identifier),
  }),
);

export const authRateLimits = pgTable("auth_rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").primaryKey(),
    hits: integer("hits").notNull(),
    windowStartedAt: timestamp("window_started_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    updatedAtIdx: index("rate_limit_buckets_updated_at_idx").on(table.updatedAt),
  }),
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    actorTimeIdx: index("admin_audit_logs_actor_time_idx").on(table.actorId, table.createdAt),
    targetIdx: index("admin_audit_logs_target_idx").on(table.targetType, table.targetId),
    createdAtIdx: index("admin_audit_logs_created_at_idx").on(table.createdAt),
  }),
);

// ── 2. Legacy Auth.js accounts retained for data preservation ───────────────
export const accounts = pgTable(
  "account",
  {
    userId:            uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").notNull(),
    provider:          text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token:     text("refresh_token"),
    access_token:      text("access_token"),
    expires_at:        integer("expires_at"),
    token_type:        text("token_type"),
    scope:             text("scope"),
    id_token:          text("id_token"),
    session_state:     text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    // OPTIMASI: Index untuk mempercepat login OAuth
    userIdIdx: index("account_user_id_idx").on(account.userId),
  })
);

// ── 3. Legacy Auth.js sessions retained during the Better Auth cutover ───────
export const sessions = pgTable(
  "session", 
  {
    sessionToken: text("sessionToken").primaryKey(),
    userId:       uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    expires:      timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  })
);

// ── 4. Legacy Auth.js verification tokens retained for existing email links ──
export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token:      text("token").notNull(),
    expires:    timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ── 5. Legacy Auth.js reset tokens retained for existing reset links ─────────
export const passwordResetTokens = pgTable(
  "password_reset_token",
  {
    identifier: text("identifier").notNull(),
    token:      text("token").notNull(),
    expires:    timestamp("expires", { mode: "date" }).notNull(),
  },
  (prt) => ({
    compositePk: primaryKey({ columns: [prt.identifier, prt.token] }),
  })
);

// ── 6. PAKET TRYOUT ────────────────────────────────────────────────────────
export const tryoutPackages = pgTable("tryout_packages", {
  id:          serial("id").primaryKey(),
  title:       text("title").notNull(),
  description: text("description"),
  price:       integer("price").notNull().default(0),
  isActive:    boolean("is_active").default(true),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── 7. ORDERS ─────────────────────────────────────────────────────────────
export const orders = pgTable(
  "orders", 
  {
    id:            text("id").primaryKey(), // format: ASN-{packageId}-{UUID}
    userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    packageId:     integer("package_id").notNull().references(() => tryoutPackages.id),
    amount:        integer("amount").notNull(),
    status:        text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text("payment_method"),
    snapToken:     text("snap_token"),
    transactionId: text("transaction_id"),
    refundAmount:  integer("refund_amount").notNull().default(0),
    duplicatePayment: boolean("duplicate_payment").notNull().default(false),
    reconciliationRequired: boolean("reconciliation_required").notNull().default(false),
    paidAt:        timestamp("paid_at"),
    createdAt:     timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // OPTIMASI: Sangat penting untuk dashboard histori pesanan pengguna
    userIdIdx: index("orders_user_id_idx").on(table.userId),
    packageIdIdx: index("orders_package_id_idx").on(table.packageId),
    pendingCreatedAtIdx: index("orders_pending_created_at_idx")
      .on(table.createdAt)
      .where(sql`${table.status} = 'pending'`),
    userPackagePendingIdx: index("orders_user_package_pending_idx")
      .on(table.userId, table.packageId, table.createdAt)
      .where(sql`${table.status} = 'pending'`),
      reconciliationRequiredIdx: index("orders_reconciliation_required_idx")
        .on(table.createdAt)
        .where(sql`${table.reconciliationRequired} = true`),
  })
);

// ── 8. AKSES PEMBELIAN ────────────────────────────────────────────────────
export const userAccess = pgTable(
  "user_access",
  {
    id:          serial("id").primaryKey(),
    userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    packageId:   integer("package_id").notNull().references(() => tryoutPackages.id),
    purchasedAt: timestamp("purchased_at").defaultNow(),
  },
  (table) => ({
    userPackageIdx: uniqueIndex("user_access_user_package_idx").on(
      table.userId,
      table.packageId
    ),
    // OPTIMASI: Pencarian relasi berdasarkan User
    userIdIdx: index("user_access_user_id_idx").on(table.userId),
  })
);

// ── 9. BANK SOAL ──────────────────────────────────────────────────────────
export const questions = pgTable(
  "questions",
  {
    id:         serial("id").primaryKey(),
    packageId:  integer("package_id").notNull().references(() => tryoutPackages.id, { onDelete: "cascade" }), // Cascade agar aman saat hapus paket
    kategori:   text("kategori", { enum: QUESTION_CATEGORIES }).notNull(),
    pertanyaan: text("pertanyaan").notNull(),
    
    imageUrl:    text("image_url"),
    imageAlt:    text("image_alt"),

    // Kolom legacy dipertahankan agar data lama tidak terhapus.
    isFigural:     boolean("is_figural").default(false),
    figuralConfig: jsonb("figural_config").$type<LegacyFiguralConfig>(),

    // OPTIMASI: Injeksi Type ke JSONB
    pilihan:    jsonb("pilihan").$type<QuestionChoice[]>().notNull(),
    pembahasan: text("pembahasan").notNull(),
  },
  (table) => ({
    packageIdx: index("questions_package_id_idx").on(table.packageId),
  })
);

// ── 10. RIWAYAT UJIAN ──────────────────────────────────────────────────────
export const tryoutHistories = pgTable(
  "tryout_histories", 
  {
    id:           uuid("id").defaultRandom().primaryKey(),
    userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    packageId:    integer("package_id").notNull().references(() => tryoutPackages.id),
    skorTwk:      integer("skor_twk").notNull().default(0),
    skorTiu:      integer("skor_tiu").notNull().default(0),
    skorTkp:      integer("skor_tkp").notNull().default(0),
    totalSkor:    integer("total_skor").notNull().default(0),
    isLolos:      boolean("is_lolos").notNull().default(false),
    // OPTIMASI: Injeksi Type ke JSONB
    jawabanSiswa: jsonb("jawaban_siswa").$type<Record<string, string>>().notNull(),
    startTime:    timestamp("start_time").defaultNow(),
    endTime: timestamp("end_time").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("tryout_histories_user_id_idx").on(table.userId),
    // TAMBAHKAN INI agar sorting riwayat cepat:
    endTimeIdx: index("tryout_histories_end_time_idx").on(table.endTime),
  })
);

// ── 11. SESI PENGERJAAN UJIAN ─────────────────────────────────────────────
export const tryoutAttempts = pgTable(
  "tryout_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    packageId: integer("package_id").notNull().references(() => tryoutPackages.id, { onDelete: "cascade" }),
    status: text("status", { enum: TRYOUT_ATTEMPT_STATUSES }).notNull().default("in_progress"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    submittedAt: timestamp("submitted_at"),
    historyId: uuid("history_id").references(() => tryoutHistories.id, { onDelete: "set null" }),
  },
  (table) => ({
    ownerPackageIdx: index("tryout_attempts_owner_package_idx").on(table.userId, table.packageId),
    oneActiveAttemptIdx: uniqueIndex("tryout_attempts_one_active_idx")
      .on(table.userId, table.packageId)
      .where(sql`${table.status} = 'in_progress'`),
  })
);

export const tryoutAttemptAnswers = pgTable(
  "tryout_attempt_answers",
  {
    attemptId: uuid("attempt_id").notNull().references(() => tryoutAttempts.id, { onDelete: "cascade" }),
    questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    answer: text("answer", { enum: ["A", "B", "C", "D", "E"] }),
    isFlagged: boolean("is_flagged").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    attemptQuestionPk: primaryKey({ columns: [table.attemptId, table.questionId] }),
  })
);

// ==========================================
// RELASI (RELATIONS)
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts:  many(accounts),
  sessions:  many(sessions),
  authAccounts: many(authAccounts),
  authSessions: many(authSessions),
  access:    many(userAccess),
  orders:    many(orders),
  histories: many(tryoutHistories),
}));

export const packagesRelations = relations(tryoutPackages, ({ many }) => ({
  questions: many(questions),
  access:    many(userAccess),
  orders:    many(orders),
  // TAMBAHKAN INI agar dashboard bisa tarik riwayat langsung dari paket:
  histories: many(tryoutHistories), 
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  package: one(tryoutPackages, { fields: [questions.packageId], references: [tryoutPackages.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user:    one(users,          { fields: [orders.userId],    references: [users.id] }),
  package: one(tryoutPackages, { fields: [orders.packageId], references: [tryoutPackages.id] }),
}));

export const userAccessRelations = relations(userAccess, ({ one }) => ({
  user:    one(users,          { fields: [userAccess.userId],    references: [users.id] }),
  package: one(tryoutPackages, { fields: [userAccess.packageId], references: [tryoutPackages.id] }),
}));

export const historiesRelations = relations(tryoutHistories, ({ one }) => ({
  user:    one(users,          { fields: [tryoutHistories.userId],    references: [users.id] }),
  package: one(tryoutPackages, { fields: [tryoutHistories.packageId], references: [tryoutPackages.id] }),
}));

// ==========================================
// TYPE EXPORTS (UNTUK SHADCN & APP)
// ==========================================
export type User = typeof users.$inferSelect;
export type TryoutPackage = typeof tryoutPackages.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type TryoutHistory = typeof tryoutHistories.$inferSelect;

// (Opsional) Export insert types jika Anda butuh validasi di form (Zod/React Hook Form)
export type NewUser = typeof users.$inferInsert;
export type NewOrder = typeof orders.$inferInsert;
