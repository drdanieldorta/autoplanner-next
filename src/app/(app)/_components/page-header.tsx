import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  backHref?: string;
  /** Conteúdo à direita (CTA, busca, filtros) */
  actions?: React.ReactNode;
};

/**
 * Cabeçalho padrão das páginas internas — títulos + ícone à esquerda,
 * actions à direita, opcionalmente botão Voltar.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  iconColor = "text-accent-blue",
  iconBg = "bg-accent-blue/10",
  backHref,
  actions,
}: Props) {
  return (
    <div className="space-y-4 md:space-y-6">
      {backHref && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2 ${iconBg} rounded-lg`}>
              <Icon className={`h-5 w-5 md:h-6 md:w-6 ${iconColor}`} />
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-sm md:text-base text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
