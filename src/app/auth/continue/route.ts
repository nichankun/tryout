import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appUrl } from "@/lib/app-url";
import { getDatabaseRole } from "@/lib/authz";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login?error=Default", appUrl));
  }

  // Use the persisted role for authorization and the post-login destination.
  const role = await getDatabaseRole(session.user.id);
  const destination = role === "ADMIN" ? "/admin" : "/dashboard";
  return NextResponse.redirect(new URL(destination, appUrl));
}
