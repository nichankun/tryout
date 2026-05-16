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
  uniqueIndex, // ✅ [FIX 2] untuk unique constraint userAccess
  index,       // ✅ [FIX 3] untuk index questions.packageId
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── 1. USERS ──────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"), // opsional — Google login tidak pakai password
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 2. TABEL WAJIB NEXTAUTH ───────────────────────────────────────────────
export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// ── 3. PAKET TRYOUT ───────────────────────────────────────────────────────
export const tryoutPackages = pgTable("tryout_packages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 4. AKSES PEMBELIAN ────────────────────────────────────────────────────
export const userAccess = pgTable(
  "user_access",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    packageId: integer("package_id")
      .references(() => tryoutPackages.id)
      .notNull(),
    purchasedAt: timestamp("purchased_at").defaultNow(),
  },
  // ✅ [FIX 2] Unique constraint — user tidak bisa dapat akses duplikat volume yang sama
  (table) => ({
    userPackageIdx: uniqueIndex("user_access_user_package_idx").on(
      table.userId,
      table.packageId
    ),
  })
);

// ── 5. BANK SOAL ──────────────────────────────────────────────────────────
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id")
      .references(() => tryoutPackages.id)
      .notNull(),
    kategori: text("kategori", { enum: ["TWK", "TIU", "TKP"] }).notNull(),
    pertanyaan: text("pertanyaan").notNull(),
    pilihan: jsonb("pilihan").notNull(),
    pembahasan: text("pembahasan").notNull(),
  },
  // ✅ [FIX 3] Index pada packageId — query filter soal per volume jadi cepat
  (table) => ({
    packageIdIdx: index("questions_package_id_idx").on(table.packageId),
  })
);

// ── 6. RIWAYAT UJIAN ──────────────────────────────────────────────────────
export const tryoutHistories = pgTable("tryout_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  packageId: integer("package_id")
    .references(() => tryoutPackages.id)
    .notNull(),
  skorTwk: integer("skor_twk").notNull().default(0),
  skorTiu: integer("skor_tiu").notNull().default(0),
  skorTkp: integer("skor_tkp").notNull().default(0),
  totalSkor: integer("total_skor").notNull().default(0),
  isLolos: boolean("is_lolos").notNull().default(false),
  jawabanSiswa: jsonb("jawaban_siswa").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
});

// ── 7. ORDERS (Midtrans) ──────────────────────────────────────────────────
// ✅ [FIX 1] Tabel orders wajib ada — direferensikan oleh webhook & payment route
export const orders = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => `ASN-${Date.now()}`), // format: ASN-{volumeId}-{timestamp}
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  packageId: integer("package_id")
    .references(() => tryoutPackages.id)
    .notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["pending", "paid", "failed"] })
    .notNull()
    .default("pending"),
  paymentMethod: text("payment_method"),
  snapToken: text("snap_token"),
  midtransOrderId: text("midtrans_order_id").unique(), // ✅ unique — untuk idempotency check
  transactionId: text("transaction_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── RELASI DRIZZLE ─────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  access: many(userAccess),
  histories: many(tryoutHistories),
  orders: many(orders),
}));

export const packagesRelations = relations(tryoutPackages, ({ many }) => ({
  questions: many(questions),
  access: many(userAccess),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  package: one(tryoutPackages, { fields: [orders.packageId], references: [tryoutPackages.id] }),
}));