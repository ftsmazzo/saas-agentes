import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, Tenant } from "../../drizzle/schema";
import { authenticateRequest } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null; // Admin (via OAuth ou novo sistema)
  tenant: Tenant | null; // Cliente (via novo sistema)
  authType: "admin" | "client" | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Autenticação com novo sistema (admin ou cliente)
  const { user, tenant, authType } = await authenticateRequest(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user: user || null,
    tenant: tenant || null,
    authType: authType || null,
  };
}
