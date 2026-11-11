import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDatabaseRole } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login?error=Default", request.url));
  }

  // Use the persisted role for authorization and the post-login destination.
  const role = await getDatabaseRole(session.user.id);
  const destination = role === "ADMIN" ? "/admin" : "/dashboard";
  return NextResponse.redirect(new URL(destination, request.url));
}
