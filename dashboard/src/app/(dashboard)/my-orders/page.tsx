"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ShoppingBag,
  RotateCcw,
  Ban,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/api";
import { authService } from "@/lib/auth";
import type { Order, OrderStatus } from "@/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_MAP: Record<OrderStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending:   { label: "Chờ xác nhận", className: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
  confirmed: { label: "Đã xác nhận",  className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: CheckCircle },
  shipping:  { label: "Đang giao hàng", className: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: Truck },
  done:      { label: "Đã giao thành công", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  cancelled: { label: "Đã hủy", className: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
};

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MyOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", activeTab],
    queryFn: async () => {
      try {
        const user = authService.getCurrentUser();
        const { data } = await apiClient.get<Order[]>("/orders", {
          params: {
            customerId: user?.id && user.role === "customer" ? user.id : undefined,
            status: activeTab === "all" ? undefined : activeTab,
          },
        });
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.patch(`/orders/${orderId}`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Đã hủy đơn hàng thành công.");
    },
    onError: () => toast.error("Không thể hủy đơn hàng."),
  });

  const filteredOrders = orders ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-violet-400" />
          Đơn mua của tôi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi tiến trình xử lý, giao hàng và lịch sử mua sắm của bạn
        </p>
      </div>

      {}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/50 rounded-2xl gap-1">
          <TabsTrigger value="all" className="text-xs py-2 rounded-xl">
            Tất cả
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs py-2 rounded-xl">
            Chờ xác nhận
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs py-2 rounded-xl">
            Đã xác nhận
          </TabsTrigger>
          <TabsTrigger value="shipping" className="text-xs py-2 rounded-xl">
            Đang giao
          </TabsTrigger>
          <TabsTrigger value="done" className="text-xs py-2 rounded-xl">
            Đã giao
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs py-2 rounded-xl">
            Đã hủy
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl w-full" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="border-border/40 bg-card/50 text-center py-16 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <ShoppingBag className="w-12 h-12 opacity-30 text-violet-400" />
            <div>
              <p className="font-semibold text-foreground">Không tìm thấy đơn hàng nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hãy ghé qua Cửa Hàng để khám phá và đặt mua các mẫu thời trang hot nhất nhé!
              </p>
            </div>
            <Link href="/">
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-violet-500/20">
                Khám phá Cửa Hàng
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusCfg = STATUS_MAP[order.status] || STATUS_MAP.pending;
            const StatusIcon = statusCfg.icon;

            return (
              <Card
                key={order.id}
                className="border-border/40 bg-card/60 rounded-2xl overflow-hidden shadow-sm hover:border-violet-500/30 transition-all"
              >
                {}
                <CardHeader className="py-3 px-5 border-b border-border/30 bg-muted/20 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-mono font-bold text-foreground">
                      MÃ ĐƠN: #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      ({format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })})
                    </span>
                  </div>
                  <Badge className={`text-xs gap-1 font-semibold ${statusCfg.className}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusCfg.label}
                  </Badge>
                </CardHeader>

                {}
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-border/20 last:border-none text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-violet-400 shrink-0">
                              {item.variant?.product?.code || "SP"}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-foreground">
                                {item.variant?.product?.name || item.variant?.sku || "Sản phẩm thời trang"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Phân loại: {item.variant?.color || "Tiêu chuẩn"} - {item.variant?.size || "FreeSize"} × {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="font-medium text-xs tabular-nums text-slate-200">
                            {formatVND(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Chi tiết: {order.note || "Đơn hàng thời trang"}
                      </p>
                    )}
                  </div>

                  {}
                  <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {order.note && (
                        <p className="font-medium text-slate-300">
                          {order.note}
                        </p>
                      )}
                      <p>
                        Trạng thái xử lý: <strong className="text-foreground">{statusCfg.label}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                          Tổng thanh toán
                        </span>
                        <span className="text-lg font-extrabold text-violet-400 tabular-nums">
                          {formatVND(order.totalAmount)}
                        </span>
                      </div>

                      {}
                      {order.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(order.id)}
                          disabled={cancelMutation.isPending}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-9 rounded-xl"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Hủy đơn
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
