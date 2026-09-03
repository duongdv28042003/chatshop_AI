"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  MessageSquare,
  AlertTriangle,
  Users,
  DollarSign,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerStorefront } from "@/components/shop/customer-storefront";
import { authService } from "@/lib/auth";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import apiClient from "@/lib/api";
import type { DashboardStats, RevenueChartData } from "@/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const mockStats: DashboardStats = {
  totalRevenue: 28500000,
  revenueChange: 12.5,
  totalOrders: 143,
  ordersChange: 8.2,
  pendingOrders: 17,
  activeConversations: 24,
  lowStockCount: 5,
  totalCustomers: 312,
};

const mockChartData: RevenueChartData[] = Array.from({ length: 14 }, (_, i) => ({
  date: format(
    new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000),
    "dd/MM",
    { locale: vi }
  ),
  revenue: Math.floor(Math.random() * 3000000) + 1000000,
  orders: Math.floor(Math.random() * 20) + 5,
}));

const chartConfig: ChartConfig = {
  revenue: { label: "Doanh thu", color: "hsl(var(--chart-1))" },
  orders: { label: "Đơn hàng", color: "hsl(var(--chart-2))" },
};

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  suffix,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  iconColor: string;
  suffix?: string;
}) {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">
              {value}
              {suffix && (
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {suffix}
                </span>
              )}
            </p>
            {change !== undefined && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  change >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(change)}% so với tháng trước
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [role, setRole] = useState<string>("admin");

  useEffect(() => {
    setRole(authService.getCurrentUser()?.role || "admin");
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<DashboardStats>("/dashboard/stats");
        return data;
      } catch {
        return mockStats;
      }
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<RevenueChartData[]>(
          "/dashboard/revenue"
        );
        return data;
      } catch {
        return mockChartData;
      }
    },
  });

  if (role === "customer") {
    return <CustomerStorefront />;
  }

  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tổng quan</h1>
        <p suppressHydrationWarning className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE, dd MMMM yyyy", { locale: vi })}
        </p>
      </div>

      {}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Doanh thu tháng này"
            value={formatVND(stats?.totalRevenue ?? 0)}
            change={stats?.revenueChange}
            icon={DollarSign}
            iconColor="bg-violet-500/10 text-violet-400"
          />
          <StatCard
            title="Tổng đơn hàng"
            value={stats?.totalOrders ?? 0}
            change={stats?.ordersChange}
            icon={ShoppingCart}
            iconColor="bg-blue-500/10 text-blue-400"
            suffix="đơn"
          />
          <StatCard
            title="Đơn chờ xử lý"
            value={stats?.pendingOrders ?? 0}
            icon={Package}
            iconColor="bg-amber-500/10 text-amber-400"
            suffix="đơn"
          />
          <StatCard
            title="Hội thoại đang hoạt động"
            value={stats?.activeConversations ?? 0}
            icon={MessageSquare}
            iconColor="bg-emerald-500/10 text-emerald-400"
            suffix="cuộc"
          />
        </div>
      )}

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Khách hàng"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          iconColor="bg-cyan-500/10 text-cyan-400"
          suffix="người"
        />
        <StatCard
          title="Sản phẩm sắp hết hàng"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          iconColor="bg-red-500/10 text-red-400"
          suffix="SKU"
        />
      </div>

      {}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Doanh thu 14 ngày gần nhất
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData ?? []}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v}`
                  }
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
