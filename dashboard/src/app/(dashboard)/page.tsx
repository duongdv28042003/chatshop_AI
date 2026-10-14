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
  suffix,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  iconColor?: string;
  suffix?: string;
}) {
  return (
    <Card className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
              {value}
              {suffix && (
                <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-1 font-sans">
                  {suffix}
                </span>
              )}
            </p>
            {change !== undefined && (
              <div className="pt-0.5">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
                    change >= 0
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}
                >
                  {change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(change)}% so với tháng trước
                </span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-md border border-[#17c1e8]/30 bg-[#17c1e8]/10 text-[#0c8ba8] dark:text-[#17c1e8] shrink-0">
            <Icon className="w-4 h-4 text-[#17c1e8]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(authService.getRole());
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    enabled: role === "admin" || role === "staff",
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
    enabled: role === "admin" || role === "staff",
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

  if (role === null) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (role === "customer") {
    return <CustomerStorefront />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Tổng quan</h1>
        <p suppressHydrationWarning className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-0.5">
          {format(new Date(), "EEEE, dd MMMM yyyy", { locale: vi })}
        </p>
      </div>

      {/* KPI Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Doanh thu tháng này"
            value={formatVND(stats?.totalRevenue ?? 0)}
            change={stats?.revenueChange}
            icon={DollarSign}
          />
          <StatCard
            title="Tổng đơn hàng"
            value={stats?.totalOrders ?? 0}
            change={stats?.ordersChange}
            icon={ShoppingCart}
            suffix="đơn"
          />
          <StatCard
            title="Đơn chờ xử lý"
            value={stats?.pendingOrders ?? 0}
            icon={Package}
            suffix="đơn"
          />
          <StatCard
            title="Hội thoại đang hoạt động"
            value={stats?.activeConversations ?? 0}
            icon={MessageSquare}
            suffix="cuộc"
          />
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Khách hàng"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          suffix="người"
        />
        <StatCard
          title="Sản phẩm sắp hết hàng"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          suffix="SKU"
        />
      </div>

      {/* Chart Section */}
      <Card className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <CardHeader className="pb-2 border-b border-neutral-200 dark:border-neutral-800 py-3 px-5">
          <CardTitle className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Doanh thu 14 ngày gần nhất
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 p-5">
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData ?? []}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
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
                  stroke="#17c1e8"
                  strokeWidth={2}
                  fill="#17c1e8"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
