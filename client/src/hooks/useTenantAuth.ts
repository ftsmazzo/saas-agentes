import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function useTenantAuth() {
  const [, setLocation] = useLocation();
  
  // Buscar dados do tenant logado
  const { data: tenant, isLoading, error } = trpc.clientPanel.getTenantInfo.useQuery();

  useEffect(() => {
    // Se não está carregando e não tem tenant, redirecionar para login
    if (!isLoading && !tenant && !error) {
      setLocation("/client/login");
    }
  }, [isLoading, tenant, error, setLocation]);

  return {
    tenant,
    isLoading,
    isAuthenticated: !!tenant,
  };
}
