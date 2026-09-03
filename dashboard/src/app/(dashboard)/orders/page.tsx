"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import apiClient from "@/lib/api";
import type { Order, OrderStatus } from "@/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: "Chờ xử lý",  className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  confirmed: { label: "Đã xác nhận", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  shipping:  { label: "Đang giao",  className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  done:      { label: "Hoàn thành", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Đã hủy",     className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const mockOrders: Order[] = [
  {
    id: "o1", customerId: "c1",
    customer: { id: "c1", zaloUserId: "z1", phone: "0901234567", name: "Nguyễn Văn A", address: "123 Lê Lợi, HCM", note: null, skus: [], createdAt: new Date().toISOString(), updatedAt: null },
    conversationId: null, status: "pending", note: null, totalAmount: 350000,
    assignedTo: null, createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: null,
  },
  {
    id: "o2", customerId: "c2",
    customer: { id: "c2", zaloUserId: "z2", phone: "0912345678", name: "Trần Thị B", address: "456 Nguyễn Huệ, HCM", note: null, skus: [], createdAt: new Date().toISOString(), updatedAt: null },
    conversationId: null, status: "shipping", note: null, totalAmount: 200000,
    assignedTo: null, createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: null,
  },
  {
    id: "o3", customerId: "c3",
    customer: { id: "c3", zaloUserId: "z3", phone: "0923456789", name: "Lê Văn C", address: null, note: null, skus: [], createdAt: new Date().toISOString(), updatedAt: null },
    conversationId: null, status: "done", note: null, totalAmount: 600000,
    assignedTo: null, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: null,
  },
];

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", search, statusFilter],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<Order[]>("/orders", {
          params: { search, status: statusFilter === "all" ? undefined : statusFilter },
        });
        return data;
      } catch {
        return mockOrders.filter((o) => statusFilter === "all" || o.status === statusFilter);
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiClient.patch(`/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã cập nhật trạng thái đơn hàng");
    },
    onError: () => toast.error("Cập nhật thất bại"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
        <p className="text-muted-foreground text-sm mt-1">Quản lý và xử lý đơn hàng từ chatbot</p>
      </div>

      {}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | OrderStatus)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
          <TabsTrigger value="confirmed">Đã xác nhận</TabsTrigger>
          <TabsTrigger value="shipping">Đang giao</TabsTrigger>
          <TabsTrigger value="done">Hoàn thành</TabsTrigger>
          <TabsTrigger value="cancelled">Đã hủy</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (orders ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Không có đơn hàng nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((order) => {
                  const cfg = STATUS_CONFIG[order.status];
                  return (
                    <TableRow key={order.id} className="border-border/40 hover:bg-muted/30">
                      <TableCell className="font-medium">{order.customer?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {order.customer?.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatVND(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status === "pending" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "confirmed" })}>
                                ✅ Xác nhận đơn
                              </DropdownMenuItem>
                            )}
                            {order.status === "confirmed" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "shipping" })}>
                                🚚 Bắt đầu giao hàng
                              </DropdownMenuItem>
                            )}
                            {order.status === "shipping" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "done" })}>
                                🎉 Đánh dấu hoàn thành
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400"
                              onClick={() => updateStatus.mutate({ id: order.id, status: "cancelled" })}
                            >
                              ❌ Hủy đơn
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
