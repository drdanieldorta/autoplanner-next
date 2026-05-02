import Link from "next/link";
import {
  FileText,
  Calculator,
  ArrowLeft,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type MenuItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
};

const items: MenuItem[] = [
  {
    title: "Protocolos",
    description: "Gerenciar protocolos de procedimentos",
    icon: FileText,
    path: "/protocolos",
  },
  {
    title: "Orçamentos",
    description: "Gerenciar orçamentos de clientes",
    icon: Calculator,
    path: "/orcamentos",
  },
  {
    title: "Contratos",
    description: "Gerenciar modelos de contratos",
    icon: ScrollText,
    path: "/contratos",
  },
];

export const metadata = { title: "Sistema de Acompanhamento · InfinitePlan" };

export default async function SistemaAcompanhamentoPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Sistema de Acompanhamento
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Gerenciamento de protocolos e orçamentos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Gerenciamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Link
                key={item.title}
                href={item.path}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <Card className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                          <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-muted-foreground group-hover:text-primary transition-colors">
                        →
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
