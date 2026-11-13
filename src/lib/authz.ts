import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/database/schema";
import { eq } from "drizzle-orm";

export async function getDatabaseRole(userId: string) {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.role ?? null;
}

export async function hasAdminAccess() {
  const session = await auth();
  if (!session?.user?.id) return false;

  return (await getDatabaseRole(session.user.id)) === "ADMIN";
}

export async function requireAdminAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user?.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return { id: user.id, name: user.name, email: user.email };
}

/** Redirects page requests before protected admin data is fetched. */
export async function requireAdminPageAccess(): Promise<void> {
  try {
    await requireAdminAccess();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "UNAUTHORIZED") redirect("/login");
    if (reason === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }
}
