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
  Shirt,
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
import { findImageForColor } from "@/lib/product-utils";
import type { Order, OrderStatus } from "@/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

function OrderItemImage({
  images,
  name,
  code,
  color,
}: {
  images?: { imageUrl: string; isPrimary: boolean }[];
  name: string;
  code?: string;
  color?: string | null;
}) {
  const [hasError, setHasError] = useState(false);
  const colorMatched = images && color ? findImageForColor({ images, variants: [] } as any, color) : undefined;
  const primary = colorMatched || images?.find((img) => img.isPrimary)?.imageUrl || images?.[0]?.imageUrl;

  if (!primary || hasError) {
    return (
      <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-neutral-400 shrink-0">
        <Shirt className="w-4 h-4 opacity-40 mb-0.5 text-neutral-400" />
        <span className="text-[10px] font-mono font-medium text-neutral-500">
          {code || "SP"}
        </span>
      </div>
    );
  }

  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-border/60 shrink-0 relative flex items-center justify-center shadow-sm">
      <img
        src={primary}
        alt={name}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

const STATUS_MAP: Record<OrderStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending:   { label: "Chờ xác nhận", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800", icon: Clock },
  confirmed: { label: "Đã xác nhận",  className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800", icon: CheckCircle },
  shipping:  { label: "Đang giao", className: "bg-[#17c1e8]/10 text-[#0b809b] dark:text-[#17c1e8] border-[#17c1e8]/30", icon: Truck },
  done:      { label: "Đã giao", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", icon: CheckCircle },
  cancelled: { label: "Đã hủy", className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800", icon: XCircle },
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
        let customerId = user?.id && user.role === "customer" ? user.id : undefined;

        let { data } = await apiClient.get<Order[]>("/orders", {
          params: {
            customerId,
            status: activeTab === "all" ? undefined : activeTab,
          },
        });

        // Nếu chưa có đơn theo customerId nhưng tài khoản có SĐT, tìm thêm theo SĐT
        if ((!data || data.length === 0) && user?.phone) {
          const { data: byPhone } = await apiClient.get<Order[]>("/orders", {
            params: {
              search: user.phone,
              status: activeTab === "all" ? undefined : activeTab,
            },
          });
          if (byPhone && byPhone.length > 0) {
            data = byPhone;
          }
        }

        return data ?? [];
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
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#17c1e8]" />
          Đơn mua của tôi
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-0.5">
          Theo dõi tiến trình xử lý, giao hàng và lịch sử mua sắm của bạn
        </p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md gap-1">
          <TabsTrigger value="all" className="text-xs py-1.5 rounded-sm font-medium data-active:bg-[#17c1e8] data-active:text-slate-950 data-active:font-bold data-active:shadow-sm data-[state=active]:bg-[#17c1e8] data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-sm">
            Tất cả
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs py-1.5 rounded-sm font-medium data-active:bg-[#17c1e8] data-active:text-slate-950 data-active:font-bold data-active:shadow-sm data-[state=active]:bg-[#17c1e8] data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-sm">
            Chờ xác nhận
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs py-1.5 rounded-sm font-medium data-active:bg-[#17c1e8] data-active:text-slate-950 data-active:font-bold data-active:shadow-sm data-[state=active]:bg-[#17c1e8] data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-sm">
            Đã xác nhận
          </TabsTrigger>
          <TabsTrigger value="shipping" className="text-xs py-1.5 rounded-sm font-medium data-active:bg-[#17c1e8] data-active:text-slate-950 data-active:font-bold data-active:shadow-sm data-[state=active]:bg-[#17c1e8] data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-sm">
            Đang giao
          </TabsTrigger>
          <TabsTrigger value="done" className="text-xs py-1.5 rounded-sm font-medium data-active:bg-[#17c1e8] data-active:text-slate-950 data-active:font-bold data-active:shadow-sm data-[state=active]:bg-[#17c1e8] data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-sm">
            Đã giao
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs py-1.5 rounded-sm font-medium data-active:bg-[#17c1e8] data-active:text-slate-950 data-active:font-bold data-active:shadow-sm data-[state=active]:bg-[#17c1e8] data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-sm">
            Đã hủy
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg w-full" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-center py-12 px-4 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-[#17c1e8] opacity-60" />
            <div>
              <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Không tìm thấy đơn hàng nào</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Hãy ghé qua Cửa Hàng để khám phá và đặt mua các mẫu thời trang mới nhất.
              </p>
            </div>
            <Link href="/">
              <Button className="rounded-md bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] font-bold text-xs h-8 px-4 shadow-sm">
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
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden"
              >
                {/* Header */}
                <CardHeader className="py-2.5 px-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-[#17c1e8]" />
                    <span className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
                      • {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </span>
                  </div>
                  <Badge className={`text-xs gap-1 font-mono font-medium rounded-full border px-2 py-0.5 ${statusCfg.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </Badge>
                </CardHeader>

                {/* Content */}
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => {
                        const product = item.variant?.product;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-850 last:border-none text-xs gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <OrderItemImage
                                images={product?.images}
                                name={product?.name || item.variant?.sku || "Sản phẩm"}
                                code={product?.code}
                                color={item.variant?.color}
                              />
                              <div className="min-w-0 space-y-0.5">
                                <p className="font-medium text-xs text-neutral-900 dark:text-neutral-100 truncate flex items-center gap-1.5">
                                  {product?.code && (
                                    <span className="px-1.5 py-0.2 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-[10px] shrink-0">
                                      {product.code}
                                    </span>
                                  )}
                                  <span className="truncate">
                                    {product?.name || item.variant?.sku || "Sản phẩm thời trang"}
                                  </span>
                                </p>
                                <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 flex-wrap font-mono">
                                  <span>{item.variant?.color || "Tiêu chuẩn"} / {item.variant?.size || "FreeSize"}</span>
                                  <span>×{item.quantity}</span>
                                </p>
                              </div>
                            </div>
                            <span className="font-mono font-semibold text-xs text-neutral-900 dark:text-neutral-100 shrink-0">
                              {formatVND(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-neutral-500 italic">
                        Chi tiết: {order.note || "Đơn hàng thời trang"}
                      </p>
                    )}
                  </div>

                  {/* Footer Order Summary */}
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-neutral-500 space-y-0.5">
                      {order.note && (
                        <p className="text-neutral-700 dark:text-neutral-300">
                          {order.note}
                        </p>
                      )}
                      <p>
                        Trạng thái: <strong className="text-neutral-900 dark:text-neutral-100 font-medium">{statusCfg.label}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-neutral-500 block uppercase">
                          Tổng thanh toán
                        </span>
                        <span className="text-base font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
                          {formatVND(order.totalAmount)}
                        </span>
                      </div>

                      {order.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(order.id)}
                          disabled={cancelMutation.isPending}
                          className="rounded-md border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs h-8 px-3"
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
