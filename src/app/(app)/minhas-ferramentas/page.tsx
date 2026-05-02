import Link from "next/link";
import { Layout, ArrowRight } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { listToolsForUser } from "@/lib/services/user-tools";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "../_components/page-header";
import { EmptyState } from "../_components/empty-state";

export const metadata = { title: "Minhas Ferramentas · InfinitePlan" };
export const dynamic = "force-dynamic";

/**
 * Mapa nome → rota interna. Replica o `handleFerramentaClick` do Vite
 * legacy. Pra rotas que não casam com nenhum padrão, deixamos o card
 * abrindo um info toast (vide ferramentas não-implementadas).
 */
function toolHref(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes("acompanhamento")) return "/sistema-acompanhamento";
  if (lower.includes("protocolo")) return "/protocolos";
  if (lower.includes("orçamento") || lower.includes("orcamento"))
    return "/orcamentos";
  if (lower.includes("contrato")) return "/contratos";
  return null;
}

export default async function MinhasFerramentasPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Sua conta não está associada a uma empresa.
        </p>
      </div>
    );
  }

  const tools = await listToolsForUser({
    userId: user.id,
    companyId: user.companyId,
    isCompanyAdmin: user.isCompanyAdmin,
  });

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title={user.isCompanyAdmin ? "Ferramentas da Empresa" : "Minhas Ferramentas"}
        description={
          user.isCompanyAdmin
            ? "Todas as ferramentas disponíveis para sua empresa"
            : "Ferramentas que o administrador liberou para você"
        }
        icon={Layout}
        backHref="/"
      />

      {tools.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Layout}
              title="Nenhuma ferramenta disponível"
              description={
                user.isCompanyAdmin
                  ? "Nenhuma ferramenta foi vinculada à sua empresa ainda."
                  : "Você ainda não tem permissão para nenhuma ferramenta. Entre em contato com o administrador."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const href = toolHref(tool.name);
            const inner = (
              <Card className="hover:border-primary/50 transition-colors group cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                        <Layout className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {tool.name}
                        </h3>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
            return href ? (
              <Link key={tool.id} href={href}>
                {inner}
              </Link>
            ) : (
              <div key={tool.id} title="Ferramenta sem rota mapeada">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
