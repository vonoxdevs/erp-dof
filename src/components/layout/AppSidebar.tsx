import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Tags,
  FileText,
  BarChart3,
  MessageSquare,
  User,
  Users,
  Shield,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transações", url: "/transactions", icon: Receipt },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Contas Bancárias", url: "/bank-accounts", icon: Building2 },
  { title: "Categorias", url: "/categories", icon: Tags },
  { title: "Clientes", url: "/contacts", icon: UserCircle },
];

const supportItems = [
  { title: "Assistente IA", url: "/ai-assistant", icon: MessageSquare },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Perfil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { hasRole, company } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const getNavClass = (path: string) =>
    isActive(path)
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "hover:bg-muted";

  return (
    <Sidebar collapsible="icon" className={open ? "w-64" : "w-16"}>
      {/* Header com Logo e Nome da Empresa */}
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className={`rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden transition-all ${open ? "w-24 h-24" : "w-10 h-10"}`}>
            {company?.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name || "Logo"} 
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <Building2 className={`text-primary ${open ? "w-12 h-12" : "w-6 h-6"}`} />
            )}
          </div>
          {open && (
            <div className="text-center space-y-1">
              <h2 className="font-bold text-base leading-tight">
                {company?.name || "ERP Financeiro"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Sistema de Gestão
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="w-4 h-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support & Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Suporte & Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="w-4 h-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {hasRole(['admin', 'moderator']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/users" className={getNavClass("/users")}>
                      <Users className="w-4 h-4" />
                      {open && <span>Usuários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Super Admin Section */}
        {hasRole(['super_admin']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin" className={getNavClass("/super-admin")}>
                      <Shield className="w-4 h-4" />
                      {open && <span>Painel Master</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
