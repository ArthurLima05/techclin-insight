import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, MessageSquare, Calendar, LogOut } from 'lucide-react';
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

export function AppSidebar() {
  const { clinic, setClinic } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    setClinic(null);
    toast({
      title: "Logout realizado",
      description: "Até logo!",
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
  ].filter(item => item.enabled);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">LOGO</span>
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">TechClin</h2>
            <p className="text-sm text-sidebar-foreground/80">{clinic.nome}</p>
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
          variant="outline"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}