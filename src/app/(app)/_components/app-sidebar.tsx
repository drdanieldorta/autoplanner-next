"use client";

import {
  LayoutDashboard,
  FileText,
  Calculator,
  Settings,
  Users,
  Layout as LayoutIcon,
  FileSignature,
  ShieldCheck,
  ExternalLink,
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
  /** Quando true, abre em nova aba via <a target="_blank">. */
  external?: boolean;
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Visão geral do sistema",
  },
  {
    title: "Painel Admin",
    url: "/admin",
    icon: ShieldCheck,
    description: "Panorama de empresas",
    superAdminOnly: true,
  },
  {
    title: "Dashboard MDIA",
    url: "https://dashboard-mdia.vercel.app/",
    icon: ExternalLink,
    description: "Painel externo (nova aba)",
    superAdminOnly: true,
    external: true,
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
              {filtered.map((item) => {
                const itemActive = !item.external && isActive(item.url);
                const inner = (
                  <>
                    <item.icon
                      className={`h-5 w-5 ${
                        itemActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex flex-col ml-2">
                        <span
                          className={`font-medium text-sm ${
                            itemActive ? "text-primary-foreground" : ""
                          }`}
                        >
                          {item.title}
                        </span>
                        <span
                          className={`text-xs my-px py-0 ${
                            itemActive
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground group-hover:text-sidebar-foreground"
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    )}
                  </>
                );
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`group relative transition-all duration-200 ${
                        itemActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-sidebar-accent text-sidebar-foreground"
                      }`}
                    >
                      {item.external ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="my-[10px] py-[23px] touch-manipulation"
                        >
                          {inner}
                        </a>
                      ) : (
                        <Link
                          href={item.url}
                          className="my-[10px] py-[23px] touch-manipulation"
                        >
                          {inner}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
