"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Search, Bot, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import apiClient from "@/lib/api";
import type { Conversation, ConversationStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_CONFIG: Record<ConversationStatus, { label: string; className: string; icon: React.ElementType }> = {
  ai_handling:    { label: "AI đang trả lời", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Bot },
  human_handling: { label: "Nhân viên xử lý", className: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: User },
  closed:         { label: "Đã đóng", className: "bg-muted text-muted-foreground", icon: CheckCircle },
};

const mockConversations: Conversation[] = [
  {
    id: "cv1", customerId: "c1", zaloUserId: "z1", status: "ai_handling",
    isHumanMode: false, assignedTo: null,
    customer: { id: "c1", zaloUserId: "z1", phone: "0901234567", name: "Nguyễn Văn A", address: null, note: null, skus: [], createdAt: new Date().toISOString(), updatedAt: null },
    lastMessage: { id: "m1", conversationId: "cv1", role: "user", content: "Áo A02 màu đen size M còn không ạ?", imageUrl: null, createdAt: new Date(Date.now() - 120000).toISOString() },
    createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "cv2", customerId: "c2", zaloUserId: "z2", status: "human_handling",
    isHumanMode: true, assignedTo: "staff1",
    customer: { id: "c2", zaloUserId: "z2", phone: "0912345678", name: "Trần Thị B", address: null, note: null, skus: [], createdAt: new Date().toISOString(), updatedAt: null },
    lastMessage: { id: "m2", conversationId: "cv2", role: "user", content: "Cho mình đặt 2 áo nhé", imageUrl: null, createdAt: new Date(Date.now() - 300000).toISOString() },
    createdAt: new Date(Date.now() - 1800000).toISOString(), updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
];

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ConversationStatus>("all");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", search, statusFilter],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<Conversation[]>("/conversations", {
          params: { search, status: statusFilter === "all" ? undefined : statusFilter },
        });
        return data;
      } catch {
        return mockConversations.filter(
          (c) => statusFilter === "all" || c.status === statusFilter
        );
      }
    },
  });

  const claimConversation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/conversations/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã nhận xử lý hội thoại");
    },
    onError: () => toast.error("Thất bại"),
  });

  const closeConversation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/conversations/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã đóng hội thoại");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hội thoại</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi và xử lý hội thoại từ khách hàng Zalo
        </p>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | ConversationStatus)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="ai_handling">AI đang xử lý</TabsTrigger>
          <TabsTrigger value="human_handling">Nhân viên xử lý</TabsTrigger>
          <TabsTrigger value="closed">Đã đóng</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (conversations ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">Không có hội thoại nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(conversations ?? []).map((conv) => {
            const cfg = STATUS_CONFIG[conv.status];
            const StatusIcon = cfg.icon;
            return (
              <Card
                key={conv.id}
                className="border-border/40 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-sm font-semibold">
                        {conv.customer?.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>

                    {}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {conv.customer?.name ?? "Khách hàng"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {conv.customer?.phone ?? conv.zaloUserId}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(conv.updatedAt ?? conv.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {conv.lastMessage?.content ?? "Không có tin nhắn"}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <Badge className={`text-xs gap-1 ${cfg.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>

                        <div className="flex gap-2">
                          {conv.status === "ai_handling" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                claimConversation.mutate(conv.id);
                              }}
                            >
                              Tiếp nhận
                            </Button>
                          )}
                          {conv.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeConversation.mutate(conv.id);
                              }}
                            >
                              Đóng
                            </Button>
                          )}
                        </div>
                      </div>
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
