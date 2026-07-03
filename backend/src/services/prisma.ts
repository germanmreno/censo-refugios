import { PrismaClient, type Prisma } from "@prisma/client";
import "dotenv/config";

export { Prisma };

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});
