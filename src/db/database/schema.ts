import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ==========================================
// KONSTANTA ENUM & TYPE DEFINITIONS
// ==========================================
export const USER_ROLES = ["USER", "ADMIN"] as const;
export const ORDER_STATUSES = ["pending", "paid", "failed"] as const;
export const QUESTION_CATEGORIES = ["TWK", "TIU", "TKP"] as const;

// OPTIMASI: Interface untuk kolom JSONB agar Type-Safe di seluruh aplikasi
export interface QuestionChoice {
  opsi: string; // misal: "A", "B", "C", "D", "E"
  teks: string;
  poin: number; // TKP punya poin 1-5, TIU/TWK 0 atau 5
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
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image:         text("image"),
  passwordHash:  text("password_hash"),
  role:          text("role", { enum: USER_ROLES }).notNull().default("USER"),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ── 2. NEXTAUTH: accounts ──────────────────────────────────────────────────
export const accounts = pgTable(
  "account",
  {
    userId:            uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").$type<AdapterAccountType>().notNull(),
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

// ── 3. NEXTAUTH: sessions ──────────────────────────────────────────────────
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

// ── 4. NEXTAUTH: verificationTokens ───────────────────────────────────────
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

// ── 5. NEXTAUTH: passwordResetTokens ──────────────────────────────────────
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
    id:            text("id").primaryKey(), // format: ASN-{packageId}-{timestamp}
    userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    packageId:     integer("package_id").notNull().references(() => tryoutPackages.id),
    amount:        integer("amount").notNull(),
    status:        text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text("payment_method"),
    snapToken:     text("snap_token"),
    transactionId: text("transaction_id"),
    paidAt:        timestamp("paid_at"),
    createdAt:     timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // OPTIMASI: Sangat penting untuk dashboard histori pesanan pengguna
    userIdIdx: index("orders_user_id_idx").on(table.userId),
    packageIdIdx: index("orders_package_id_idx").on(table.packageId),
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
    endTime:      timestamp("end_time"),
  },
  (table) => ({
    // OPTIMASI: Wajib ada agar query "Riwayat Tryout Saya" bisa load instan
    userIdIdx: index("tryout_histories_user_id_idx").on(table.userId),
  })
);

// ==========================================
// RELASI (RELATIONS)
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts:  many(accounts),
  sessions:  many(sessions),
  access:    many(userAccess),
  orders:    many(orders),
  histories: many(tryoutHistories),
}));

export const packagesRelations = relations(tryoutPackages, ({ many }) => ({
  questions: many(questions),
  access:    many(userAccess),
  orders:    many(orders),
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