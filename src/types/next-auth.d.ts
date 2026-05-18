import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Memperluas tipe Session agar mengenali properti role dan id
   */
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER"; 
    } & DefaultSession["user"];
  }

  /**
   * Memperluas tipe User dari database
   */
  interface User extends DefaultUser {
    role: "ADMIN" | "USER";
  }
}

declare module "next-auth/jwt" {
  /**
   * Memperluas tipe JWT token agar bisa menyimpan role
   */
  interface JWT {
    role?: "ADMIN" | "USER";
  }
}