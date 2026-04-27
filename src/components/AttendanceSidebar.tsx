import { LayoutDashboard, Camera, History, Settings, Users, UserCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
} from "@/components/ui/sidebar";

interface AttendanceSidebarProps {
  userRole: "student" | "teacher" | "admin";
}

const studentNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Attendance", url: "/attendance", icon: History },
  { title: "My Profile", url: "/profile", icon: UserCircle },
];

const teacherNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Take Attendance", url: "/capture", icon: Camera },
  { title: "Managing Students", url: "/students", icon: Users },
  { title: "My Profile", url: "/profile", icon: UserCircle },
];

const adminNavItems = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "All Records", url: "/records", icon: History },
  { title: "Manage Users", url: "/students", icon: Users },
];

export function AttendanceSidebar({ userRole }: AttendanceSidebarProps) {
  const navItems = userRole === "admin" ? adminNavItems : userRole === "student" ? studentNavItems : teacherNavItems;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">AttendEase</h2>
            <p className="text-xs text-muted-foreground capitalize">{userRole} Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
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
