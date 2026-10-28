"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Ao abrir a listagem, pede ao servidor para conferir na Autentique os
 * contratos ainda sem assinatura registrada. Se algum foi assinado, recarrega
 * a lista para a coluna "Contrato" mostrar. Não renderiza nada.
 */
export function SincronizarAssinaturas() {
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/contratos/sincronizar", {
          method: "POST",
        });
        if (!res.ok || cancelado) return;
        const data = (await res.json()) as { assinados?: number };
        if ((data.assinados ?? 0) > 0) router.refresh();
      } catch {
        // Silencioso: a lista segue com o que o banco já sabe.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [router]);

  return null;
}
