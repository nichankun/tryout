import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  jsonb, 
  uuid,
  primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── 1. USERS (Diperbarui untuk NextAuth) ──
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }), // Wajib untuk NextAuth
  image: text("image"), // Wajib untuk NextAuth (Foto profil Google)
  passwordHash: text("password_hash"), // Dibuat opsional karena login Google tidak pakai password
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 2. TABEL WAJIB NEXTAUTH (Accounts, Sessions, Verification) ──
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

// ── 3. PAKET TRYOUT (Volume) ──
export const tryoutPackages = pgTable("tryout_packages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), 
  description: text("description"),
  price: integer("price").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 4. AKSES PEMBELIAN ──
export const userAccess = pgTable("user_access", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  packageId: integer("package_id").references(() => tryoutPackages.id).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// ── 5. BANK SOAL ──
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => tryoutPackages.id).notNull(),
  kategori: text("kategori", { enum: ['TWK', 'TIU', 'TKP'] }).notNull(),
  pertanyaan: text("pertanyaan").notNull(),
  pilihan: jsonb("pilihan").notNull(), 
  pembahasan: text("pembahasan").notNull(),
});

// ── 6. RIWAYAT / HASIL UJIAN SISWA ──
export const tryoutHistories = pgTable("tryout_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  packageId: integer("package_id").references(() => tryoutPackages.id).notNull(),
  
  skorTwk: integer("skor_twk").notNull().default(0),
  skorTiu: integer("skor_tiu").notNull().default(0),
  skorTkp: integer("skor_tkp").notNull().default(0),
  totalSkor: integer("total_skor").notNull().default(0),
  isLolos: boolean("is_lolos").notNull().default(false),
  
  jawabanSiswa: jsonb("jawaban_siswa").notNull(), 
  
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
});

// ── RELASI DRIZZLE ──
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  access: many(userAccess),
  histories: many(tryoutHistories),
}));

export const packagesRelations = relations(tryoutPackages, ({ many }) => ({
  questions: many(questions),
  access: many(userAccess),
}));