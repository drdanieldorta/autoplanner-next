"use client";

import {
  LayoutDashboard,
  FileText,
  Calculator,
  Settings,
  Users,
  Layout as LayoutIcon,
  FileSignature,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
  superAdminOnly?: boolean;
  companyAdminOnly?: boolean;
  companyOnly?: boolean;
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Visão geral do sistema",
  },
  {
    title: "Ferramentas",
    url: "/ferramentas",
    icon: LayoutIcon,
    description: "Gerenciar ferramentas do sistema",
    superAdminOnly: true,
  },
  {
    title: "Minhas Ferramentas",
    url: "/minhas-ferramentas",
    icon: LayoutIcon,
    description: "Ferramentas disponíveis",
    companyOnly: true,
  },
  {
    title: "Protocolos",
    url: "/protocolos",
    icon: FileText,
    description: "Gerenciar protocolos médicos",
  },
  {
    title: "Orçamentos",
    url: "/orcamentos",
    icon: Calculator,
    description: "Propostas e orçamentos",
  },
  {
    title: "Contratos",
    url: "/contratos",
    icon: FileSignature,
    description: "Modelos de contrato",
    companyAdminOnly: true,
  },
  {
    title: "Funcionários",
    url: "/funcionarios",
    icon: Users,
    description: "Gerenciar funcionários",
    companyAdminOnly: true,
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: Users,
    description: "Gerenciar usuários do sistema",
    superAdminOnly: true,
  },
  {
    title: "Meu Perfil",
    url: "/perfil",
    icon: Users,
    description: "Visualizar e editar perfil",
  },
  {
    title: "Configuração",
    url: "/configuracao",
    icon: Settings,
    description: "Credenciais e webhooks",
    adminOnly: true,
  },
];

type Props = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
};

export function AppSidebar({ isAdmin, isSuperAdmin, isCompanyAdmin }: Props) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const filtered = menuItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.companyAdminOnly) return isCompanyAdmin && !isSuperAdmin;
    if (item.companyOnly) return !isSuperAdmin;
    if (item.adminOnly) return isAdmin || isSuperAdmin;
    return true;
  });

  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground px-4 py-2">
            {isCollapsed ? "" : "PAINEL CLÍNICA"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {filtered.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`group relative transition-all duration-200 ${
                      isActive(item.url)
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "hover:bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <Link
                      href={item.url}
                      className="my-[10px] py-[23px] touch-manipulation"
                    >
                      <item.icon
                        className={`h-5 w-5 ${
                          isActive(item.url)
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="flex flex-col ml-2">
                          <span
                            className={`font-medium text-sm ${
                              isActive(item.url) ? "text-primary-foreground" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                          <span
                            className={`text-xs my-px py-0 ${
                              isActive(item.url)
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground group-hover:text-sidebar-foreground"
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
