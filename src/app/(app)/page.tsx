import Link from "next/link";
import {
  FileText,
  Settings,
  Users,
  Layout as LayoutIcon,
  Search,
  type LucideIcon,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DashboardItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
};

type DashboardSection = {
  title: string;
  items: DashboardItem[];
};

export const metadata = { title: "Dashboard · InfinitePlan" };

export default async function DashboardPage() {
  const user = await requireUser();

  const sections: DashboardSection[] = [];

  if (user.isSuperAdmin) {
    sections.push(
      {
        title: "Administração",
        items: [
          {
            title: "Empresas",
            description: "Gerenciar empresas do sistema",
            icon: LayoutIcon,
            path: "/empresas",
          },
        ],
      },
      {
        title: "Ferramentas",
        items: [
          {
            title: "Sistema de Acompanhamento",
            description: "Protocolos e Orçamentos",
            icon: FileText,
            path: "/sistema-acompanhamento",
          },
        ],
      },
      {
        title: "Configuração",
        items: [
          {
            title: "Configuração",
            description: "Credenciais e webhooks",
            icon: Settings,
            path: "/configuracao",
          },
        ],
      },
    );
  } else if (user.isAdmin) {
    sections.push(
      {
        title: "Ferramentas",
        items: [
          {
            title: "Minhas Ferramentas",
            description: "Ferramentas disponíveis",
            icon: LayoutIcon,
            path: "/minhas-ferramentas",
          },
        ],
      },
      {
        title: "Gestão de Acesso",
        items: [
          {
            title: "Funcionários",
            description: "Gerenciar funcionários",
            icon: Users,
            path: "/funcionarios",
          },
        ],
      },
      {
        title: "Configuração",
        items: [
          {
            title: "Configuração",
            description: "Credenciais e webhooks",
            icon: Settings,
            path: "/configuracao",
          },
        ],
      },
    );
  } else {
    sections.push(
      {
        title: "Ferramentas",
        items: [
          {
            title: "Minhas Ferramentas",
            description: "Ferramentas disponíveis",
            icon: LayoutIcon,
            path: "/minhas-ferramentas",
          },
        ],
      },
      {
        title: "Perfil",
        items: [
          {
            title: "Meu Perfil",
            description: "Visualizar e editar perfil",
            icon: Users,
            path: "/perfil",
          },
        ],
      },
    );
  }

  if (user.isAdmin) {
    sections.push({
      title: "Perfil",
      items: [
        {
          title: "Meu Perfil",
          description: "Visualizar e editar perfil",
          icon: Users,
          path: "/perfil",
        },
      ],
    });
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Listagem de todos os menus disponíveis
            </p>
          </div>
          <div className="w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtro de busca por título do menu..."
                className="pl-10 bg-card border-border"
                disabled
              />
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item) => (
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
        ))}
      </div>
    </div>
  );
}
