import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, MessageSquare, Calendar, LogOut, UserCog } from 'lucide-react';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppSidebar() {
  const { clinic, signOut } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    signOut();
    toast({
      title: "Sessão Encerrada",
      description: "Logout realizado com segurança. Até logo!",
    });
    navigate('/');
  };

  if (!clinic) return null;

  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: BarChart3,
      enabled: clinic.dashboard_ativo,
    },
    {
      title: "Feedbacks",
      url: "/feedbacks",
      icon: MessageSquare,
      enabled: clinic.feedbacks_ativos,
    },
    {
      title: "Agenda",
      url: "/agenda",
      icon: Calendar,
      enabled: clinic.agenda_ativa,
    },
    {
      title: "Doutores",
      url: "/medicos",
      icon: UserCog,
      enabled: true, // Sempre disponível
    },
  ].filter(item => item.enabled);

  const handleMenuClick = () => {
    if (isMobile) {
      // Auto-hide sidebar on mobile when menu item is clicked
      const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
      if (sidebarTrigger) {
        sidebarTrigger.click();
      }
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 sticky top-0 bg-sidebar border-b">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <img 
              src="/src/assets/logo-menu.png" 
              alt="TechClin Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-sidebar-foreground/80 truncate">{clinic.nome}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      onClick={handleMenuClick}
                      className={({ isActive }) =>
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}