"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Phone, MapPin, Crown, Mail, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import apiClient from "@/lib/api";
import type { Customer, CustomerTier } from "@/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const TIER_CONFIG: Record<CustomerTier, { label: string; className: string }> = {
  standard: { label: "Thường", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  silver:   { label: "Bạc (Silver)", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  gold:     { label: "Vàng (Gold)", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  vip:      { label: "VIP ⭐", className: "bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold" },
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", search, tierFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<Customer[]>("/customers", {
        params: { search, tier: tierFilter === "all" ? undefined : tierFilter }
      });
      return data;
    },
  });

  const updateTier = useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: CustomerTier }) =>
      apiClient.patch(`/customers/${id}/tier`, { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã cập nhật phân hạng khách hàng!");
    },
    onError: () => toast.error("Cập nhật phân hạng thất bại"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khách hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý tài khoản, phân hạng và lịch sử mua sắm của khách hàng
          </p>
        </div>
      </div>

      <Tabs value={tierFilter} onValueChange={setTierFilter}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">Tất cả khách</TabsTrigger>
          <TabsTrigger value="standard">Khách thường</TabsTrigger>
          <TabsTrigger value="silver">Hạng Bạc</TabsTrigger>
          <TabsTrigger value="gold">Hạng Vàng</TabsTrigger>
          <TabsTrigger value="vip">Khách VIP ⭐</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, SĐT, Email..."
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
          ) : (customers ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Chưa có khách hàng nào phù hợp</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Phân hạng (Tier)</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead className="text-center">Đã mua</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customers ?? []).map((customer) => {
                  const tierCfg = TIER_CONFIG[customer.tier ?? "standard"] || TIER_CONFIG.standard;
                  return (
                    <TableRow key={customer.id} className="border-border/40 hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-semibold">
                              {customer.name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {customer.name ?? "Khách vãng lai"}
                              {customer.tier === "vip" && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Role: <span className="text-violet-400 font-mono">{customer.role}</span>
                            </p>
                            {customer.note && (
                              <p className="text-xs text-amber-400 mt-0.5">{customer.note}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${tierCfg.className}`}>
                          {tierCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {customer.phone ?? "—"}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-[180px] truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{customer.address ?? "Chưa có"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {customer.skus?.length ?? 0} SKU
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Đổi phân hạng</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateTier.mutate({ id: customer.id, tier: "standard" })}>
                              Thường (Standard)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTier.mutate({ id: customer.id, tier: "silver" })}>
                              Hạng Bạc (Silver)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTier.mutate({ id: customer.id, tier: "gold" })}>
                              Hạng Vàng (Gold)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTier.mutate({ id: customer.id, tier: "vip" })} className="text-purple-400 font-medium">
                              ⭐ Khách VIP
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
