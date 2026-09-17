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
import { authService, type UnifiedUser } from "@/lib/auth";
import { BrandLogo } from "@/components/ui/brand-logo";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(authService.getCurrentUser());
    setMounted(true);
  }, []);

  const role: "admin" | "staff" | "customer" =
    (user?.role as "admin" | "staff" | "customer") ||
    (mounted ? authService.getRole() : "customer");

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

  const roleLabel =
    role === "customer"
      ? "Khách Hàng"
      : role === "admin"
      ? "Quản Trị Viên"
      : "Nhân Viên Shop";

  return (
    <Sidebar className="border-r border-border">
      {/* Header */}
      <SidebarHeader className="h-14 flex items-center justify-between px-4 border-b border-border bg-sidebar shrink-0">
        <BrandLogo
          size="md"
          subtitle={roleLabel}
        />
      </SidebarHeader>

      {/* Navigation */}
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
                              ? "text-[#17c1e8]"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            active ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        {active && (
                          <ChevronRight className="ml-auto w-3.5 h-3.5 text-[#17c1e8]" />
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

      {/* Footer User Account */}
      <SidebarFooter className="border-t border-border py-3">
        <div className="flex items-center justify-between gap-2 px-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.fullName || user?.name || "Người dùng"}
            </p>
          </div>
          <button
            onClick={() => authService.logout()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
