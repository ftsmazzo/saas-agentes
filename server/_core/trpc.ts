import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware para admin (mantém compatibilidade)
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Middleware para cliente (tenant)
const requireTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.tenant) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Você precisa estar logado como cliente" });
  }

  return next({
    ctx: {
      ...ctx,
      tenant: ctx.tenant,
    },
  });
});

// Middleware que aceita admin OU cliente
const requireAuth = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user && !ctx.tenant) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({ ctx });
});

// Procedure protegida (admin ou cliente)
export const protectedProcedure = t.procedure.use(requireAuth);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
