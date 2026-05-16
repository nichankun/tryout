import { handlers } from "@/auth";

// ✅ Export GET & POST handler dari NextAuth v5
// File ini wajib ada agar callback Google OAuth bisa diproses
export const { GET, POST } = handlers;