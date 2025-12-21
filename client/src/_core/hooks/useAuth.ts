import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/client/login" } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      // Redirecionar para home após logout
      window.location.href = "/";
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const authData = meQuery.data;
    
    // Normalizar dados: se for cliente, criar objeto user-like
    let normalizedUser: any = null;
    if (authData) {
      if (authData.type === 'admin' && authData.user) {
        normalizedUser = authData.user;
      } else if (authData.type === 'client' && authData.tenant) {
        // Criar objeto user-like para cliente (compatibilidade)
        normalizedUser = {
          id: authData.tenant.id,
          email: authData.tenant.email,
          name: authData.tenant.companyName,
          role: 'client' as const,
          tenant: authData.tenant, // Incluir tenant completo
        };
      }
    }
    
    // Armazenar informações do usuário no localStorage (compatibilidade)
    if (normalizedUser) {
      localStorage.setItem(
        "user-info",
        JSON.stringify(normalizedUser)
      );
    }
    
    return {
      user: normalizedUser,
      tenant: authData?.type === 'client' ? authData.tenant : null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(normalizedUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    // Aguardar um pouco antes de redirecionar para evitar race conditions
    const timeoutId = setTimeout(() => {
      window.location.href = redirectPath;
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.isAuthenticated,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    // Helper para verificar se é cliente
    isClient: state.user?.role === 'client',
    isAdmin: state.user?.role === 'admin',
  };
}
