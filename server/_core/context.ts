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
  // Tentar autenticação com novo sistema (admin ou cliente)
  const { user, tenant, authType } = await authenticateRequest(opts.req);

  // Se não autenticou com novo sistema, tentar OAuth antigo (compatibilidade)
  // Só tentar se OAuth estiver configurado
  if (!user && !tenant && process.env.OAUTH_SERVER_URL) {
    try {
      const { sdk } = await import("./sdk");
      const oauthUser = await sdk.authenticateRequest(opts.req);
      return {
        req: opts.req,
        res: opts.res,
        user: oauthUser,
        tenant: null,
        authType: "admin",
      };
    } catch (error) {
      // Authentication is optional for public procedures.
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user: user || null,
    tenant: tenant || null,
    authType: authType || null,
  };
}
