"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  Users,
  Settings,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Store,
  Receipt,
  Bot,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authService, type UnifiedUser } from "@/lib/auth";

interface NavGroup {
  group: string;
  roles: ("admin" | "staff" | "customer")[];
  items: {
    title: string;
    href: string;
    icon: React.ElementType;
    roles: ("admin" | "staff" | "customer")[];
  }[];
}

const navConfig: NavGroup[] = [

  {
    group: "Mua sắm & Dịch vụ",
    roles: ["customer"],
    items: [
      { title: "Cửa hàng sản phẩm", href: "/", icon: Store, roles: ["customer"] },
      { title: "Đơn mua của tôi", href: "/my-orders", icon: Receipt, roles: ["customer"] },
    ],
  },

  {
    group: "Tổng quan",
    roles: ["admin", "staff"],
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "staff"] },
    ],
  },
  {
    group: "Quản lý",
    roles: ["admin", "staff"],
    items: [
      { title: "Sản phẩm & Kho", href: "/products", icon: Package, roles: ["admin", "staff"] },
      { title: "Đơn hàng shop", href: "/orders", icon: ShoppingCart, roles: ["admin", "staff"] },
      { title: "Hội thoại Zalo", href: "/conversations", icon: MessageSquare, roles: ["admin", "staff"] },
      { title: "Khách hàng", href: "/customers", icon: Users, roles: ["admin", "staff"] },
    ],
  },

  {
    group: "Hệ thống",
    roles: ["admin"],
    items: [
      { title: "Cài đặt & Tích hợp", href: "/settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UnifiedUser | null>(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const role = (user?.role as "admin" | "staff" | "customer") || "admin";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const visibleGroups = navConfig
    .filter((g) => g.roles.includes(role))
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar variant="inset" className="border-r border-slate-700/50">
      {}
      <SidebarHeader className="border-b border-slate-700/50 py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/25 flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Fashion Shop</p>
            <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
              {role === "customer" ? (
                <>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Khách Hàng
                </>
              ) : role === "admin" ? (
                "Quản Trị Viên (Admin)"
              ) : (
                "Nhân Viên Shop"
              )}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {}
      <SidebarContent className="py-2">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-3 mb-1">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        className="group relative h-9 rounded-lg transition-all duration-150"
                      >
                        <item.icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            active
                              ? "text-violet-400"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        {active && (
                          <ChevronRight className="ml-auto w-3.5 h-3.5 text-violet-400" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {}
      <SidebarFooter className="border-t border-slate-700/50 py-3">
        <div className="flex items-center gap-3 px-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-semibold">
              {(user?.fullName || user?.name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.fullName || user?.name || "Người dùng"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              Role: <span className="text-violet-400 font-mono">{role}</span>
            </p>
          </div>
          <button
            onClick={() => authService.logout()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
