/**
 * Sistema de autenticação próprio (sem OAuth)
 * Suporta login para admin e clientes
 */

import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { User, Tenant } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import bcrypt from "bcryptjs";

export type AuthType = "admin" | "client";

export interface AuthSession {
  type: AuthType;
  userId?: number; // Para admin (users.id)
  tenantId?: number; // Para clientes (tenants.id)
  email: string;
  name: string;
}

function getSessionSecret() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "default-secret-change-me";
  if (secret === "default-secret-change-me") {
    console.warn("[Auth] WARNING: Using default JWT secret! Set JWT_SECRET in .env");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Cria token JWT para sessão
 */
export async function createAuthToken(session: AuthSession): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    type: session.type,
    userId: session.userId,
    tenantId: session.tenantId,
    email: session.email,
    name: session.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .sign(secretKey);
}

/**
 * Verifica e decodifica token JWT
 */
export async function verifyAuthToken(
  token: string | undefined | null
): Promise<AuthSession | null> {
  if (!token) {
    return null;
  }

  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const { type, userId, tenantId, email, name } = payload as Record<string, unknown>;

    if (
      typeof type !== "string" ||
      (type !== "admin" && type !== "client") ||
      typeof email !== "string" ||
      typeof name !== "string"
    ) {
      console.warn("[Auth] Invalid session payload");
      return null;
    }

    return {
      type: type as AuthType,
      userId: typeof userId === "number" ? userId : undefined,
      tenantId: typeof tenantId === "number" ? tenantId : undefined,
      email,
      name,
    };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

/**
 * Parse cookies da requisição
 */
function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) {
    return new Map<string, string>();
  }
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

/**
 * Autentica requisição (admin ou cliente)
 */
export async function authenticateRequest(req: Request): Promise<{
  user: User | null;
  tenant: Tenant | null;
  authType: AuthType | null;
}> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifyAuthToken(sessionCookie);

  if (!session) {
    return { user: null, tenant: null, authType: null };
  }

  if (session.type === "admin") {
    // Autenticação de admin
    if (!session.userId) {
      return { user: null, tenant: null, authType: null };
    }

    const user = await db.getUserById(session.userId);
    if (!user || user.role !== "admin") {
      return { user: null, tenant: null, authType: null };
    }

    return { user, tenant: null, authType: "admin" };
  } else {
    // Autenticação de cliente
    if (!session.tenantId) {
      return { user: null, tenant: null, authType: null };
    }

    const tenant = await db.getTenantById(session.tenantId);
    if (!tenant || tenant.status !== "active" || !tenant.isActivated) {
      return { user: null, tenant: null, authType: null };
    }

    return { user: null, tenant, authType: "client" };
  }
}

/**
 * Login de admin (email + senha)
 */
export async function loginAdmin(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  // Normalizar email
  const normalizedEmail = email.trim().toLowerCase();
  
  // Buscar usuário admin por email
  const user = await db.getUserByEmail(normalizedEmail);
  
  if (!user) {
    return { success: false, error: "Email ou senha inválidos" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Acesso negado. Apenas administradores podem fazer login aqui." };
  }

  // Verificar se usuário tem senha
  if (!user.passwordHash) {
    return { success: false, error: "Senha não definida. Use o script SQL para definir a senha do admin." };
  }

  // Verificar senha
  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    return { success: false, error: "Email ou senha inválidos" };
  }

  return { success: true, user };
}

/**
 * Login de cliente (email + senha via tenant)
 */
export async function loginClient(email: string, password: string): Promise<{
  success: boolean;
  tenant?: Tenant;
  error?: string;
}> {
  // Normalizar email (trim e lowercase)
  const normalizedEmail = email.trim().toLowerCase();
  
  // Buscar tenant por email
  const tenant = await db.getTenantByEmail(normalizedEmail);
  
  if (!tenant) {
    return { success: false, error: "Email ou senha inválidos" };
  }

  if (tenant.status !== "active") {
    return { success: false, error: "Sua conta está inativa. Entre em contato com o suporte." };
  }

  if (!tenant.isActivated) {
    return { success: false, error: "Sua conta ainda não foi ativada. Verifique seu email." };
  }

  if (!tenant.passwordHash) {
    return { success: false, error: "Senha não definida. Use o link de ativação enviado por email." };
  }

  // Verificar senha
  const isValid = await bcrypt.compare(password, tenant.passwordHash);
  
  if (!isValid) {
    return { success: false, error: "Email ou senha inválidos" };
  }

  return { success: true, tenant };
}

