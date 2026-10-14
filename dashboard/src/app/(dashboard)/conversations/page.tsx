"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Search,
  Bot,
  User,
  CheckCircle,
  Send,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Phone,
  X,
  Paperclip,
  CheckCheck,
  Maximize2,
  ShieldCheck,
  Headphones,
  Pencil,
  RotateCcw,
  Trash2,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import apiClient from "@/lib/api";
import type { Conversation, ConversationStatus, Message } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; className: string; icon: React.ElementType; color: string }
> = {
  ai_handling: {
    label: "AI đang trả lời",
    className: "bg-[#17c1e8]/15 text-[#0b809b] dark:text-[#17c1e8] border-[#17c1e8]/30 font-mono font-medium",
    icon: Bot,
    color: "#17c1e8",
  },
  human_handling: {
    label: "Nhân viên xử lý",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: User,
    color: "#fbbf24",
  },
  closed: {
    label: "Đã đóng",
    className: "bg-muted text-muted-foreground border-border/40",
    icon: CheckCircle,
    color: "#94a3b8",
  },
};

const QUICK_RESPONSES = [
  "Dạ shop có sẵn hàng, giao hỏa tốc 2h ạ! ⚡",
  "Dạ bạn cho shop xin chiều cao & cân nặng để tư vấn size chuẩn nha! 📏",
  "Đơn hàng của bạn đã được xác nhận và bàn giao vận chuyển ạ! 📦",
  "Dạ shop gửi bạn xem thêm bảng màu và chi tiết chất vải nhé! ✨",
];

function getValidImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `http://localhost:5000${url}`;
  return `http://localhost:5000/${url}`;
}

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ConversationStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("fs_staff_deleted_for_me");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const staffTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations list
  const {
    data: conversations = [],
    isLoading: isLoadingList,
    refetch: refetchConversations,
  } = useQuery<Conversation[]>({
    queryKey: ["conversations", search, statusFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<Conversation[]>("/conversations", {
        params: { search, status: statusFilter === "all" ? undefined : statusFilter },
      });
      return data;
    },
    refetchInterval: 2500,
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    } else if (selectedId && !conversations.some((c) => c.id === selectedId) && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Selected conversation object
  const activeConversation = conversations.find((c) => c.id === selectedId);

  // 2. Fetch full message history for selected conversation
  const {
    data: chatDetail,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery<{ conversation: Conversation; messages: Message[] }>({
    queryKey: ["conversation-messages", selectedId],
    queryFn: async () => {
      if (!selectedId) return { conversation: activeConversation!, messages: [] };
      const { data } = await apiClient.get<{ conversation: Conversation; messages: Message[] }>(
        `/conversations/${selectedId}/messages`
      );
      return data;
    },
    enabled: !!selectedId,
    refetchInterval: 1500,
  });

  const messages = chatDetail?.messages ?? [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  // 3. Send Staff Reply Mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string | null }) => {
      if (!selectedId) return;
      const { data } = await apiClient.post(`/conversations/${selectedId}/reply`, {
        content,
        imageUrl,
      });
      return data;
    },
    onSuccess: () => {
      setReplyText("");
      setAttachedImage(null);
      if (staffTextareaRef.current) staffTextareaRef.current.style.height = "auto";
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã gửi phản hồi");
    },
    onError: () => toast.error("Không thể gửi tin nhắn. Vui lòng thử lại."),
  });

  // 4. Toggle Mode Mutation (AI ⟷ Human)
  const toggleModeMutation = useMutation({
    mutationFn: async ({ id, isHumanMode }: { id: string; isHumanMode: boolean }) => {
      const { data } = await apiClient.patch(`/conversations/${id}/toggle-mode`, {
        isHumanMode,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      toast.success(
        data.isHumanMode
          ? "Đã chuyển quyền cho Nhân viên xử lý (Tắt AI)"
          : "Đã bật lại Trợ lý AI tự động phản hồi"
      );
    },
    onError: () => toast.error("Không thể chuyển đổi chế độ"),
  });

  // 5. Close / Reopen Conversation
  const closeConversationMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/conversations/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      toast.success("Đã đóng hội thoại");
    },
  });

  const reopenConversationMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/conversations/${id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      toast.success("Đã mở lại hội thoại");
    },
  });

  // 6. Delete for me (1 side - Xóa ở phía tôi)
  const handleDeleteForMe = (msgId: string) => {
    const updated = [...deletedForMeIds, msgId];
    setDeletedForMeIds(updated);
    try {
      localStorage.setItem("fs_staff_deleted_for_me", JSON.stringify(updated));
    } catch {}
    toast.success("Đã xóa tin nhắn ở phía bạn (1 phía)");
  };

  // 7. Recall message (2 sides - Thu hồi tin nhắn)
  const handleRecallMessage = async (msgId: string) => {
    try {
      await apiClient.delete(`/conversations/messages/${msgId}?recall=true`);
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã thu hồi tin nhắn (2 phía)");
    } catch {
      toast.error("Không thể thu hồi tin nhắn");
    }
  };

  // 8. Hard delete message (2 sides - Xóa vĩnh viễn cả 2 phía)
  const handleHardDeleteMessage = async (msgId: string) => {
    try {
      await apiClient.delete(`/conversations/messages/${msgId}?recall=false`);
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã xóa tin nhắn ở cả 2 phía");
    } catch {
      toast.error("Không thể xóa tin nhắn");
    }
  };

  // 9. Save edited message
  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await apiClient.put(`/conversations/messages/${msgId}`, { content: editingText.trim() });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setEditingMessageId(null);
      toast.success("Đã cập nhật tin nhắn");
    } catch {
      toast.error("Không thể chỉnh sửa tin nhắn");
    }
  };

  // Handle Image Upload for Staff Reply
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await apiClient.post<{ imageUrl: string }>("/chat/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachedImage(data.imageUrl);
      toast.success("Đã đính kèm ảnh!");
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() && !attachedImage) return;
    sendReplyMutation.mutate({
      content: replyText.trim(),
      imageUrl: attachedImage,
    });
  };

  // Counts for tabs
  const aiCount = conversations.filter((c) => c.status === "ai_handling").length;
  const humanCount = conversations.filter((c) => c.status === "human_handling").length;
  const closedCount = conversations.filter((c) => c.status === "closed").length;

  return (
    <div className="flex flex-col flex-1 h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-5.5rem)] md:max-h-[calc(100dvh-6.5rem)] min-h-0 min-w-0 gap-3 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Hội thoại Zalo & CSKH</h1>
            <Badge variant="outline" className="border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 text-xs px-2 font-mono">
              Omnichannel
            </Badge>
          </div>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">
            Quản lý hội thoại khách hàng, theo dõi phản hồi của AI và trực tiếp chat tư vấn
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs border-neutral-200 dark:border-neutral-800 rounded-md"
          onClick={() => {
            refetchConversations();
            if (selectedId) refetchMessages();
            toast.success("Đã làm mới dữ liệu");
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Làm mới</span>
        </Button>
      </div>

      {/* Main Workspace (Master-Detail Split Chat View) */}
      <div className="flex-1 min-h-0 flex min-w-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        {/* ================= LEFT COLUMN: CONVERSATION LIST ================= */}
        <div className="w-[310px] lg:w-[350px] shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 min-w-0 min-h-0 h-full overflow-hidden">
          {/* Tabs Filter */}
          <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 space-y-2 shrink-0">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | ConversationStatus)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 bg-neutral-100 dark:bg-neutral-800 p-0.5 h-8 rounded-md">
                <TabsTrigger value="all" className="text-[11px] px-1 font-mono">
                  Tất cả ({conversations.length})
                </TabsTrigger>
                <TabsTrigger value="ai_handling" className="text-[11px] px-1 font-mono text-neutral-700 dark:text-neutral-300">
                  AI ({aiCount})
                </TabsTrigger>
                <TabsTrigger value="human_handling" className="text-[11px] px-1 font-mono text-amber-500">
                  NV ({humanCount})
                </TabsTrigger>
                <TabsTrigger value="closed" className="text-[11px] px-1 font-mono">
                  Đóng ({closedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, SĐT, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs bg-muted/40 border-border/40 focus:border-neutral-400 dark:focus:border-neutral-600"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/20 custom-scrollbar min-w-0 overscroll-contain">
            {isLoadingList ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-2.5 p-2">
                    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 p-4 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-20 text-neutral-400" />
                <p className="text-xs font-medium">Không có hội thoại nào</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const status = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.ai_handling;
                const StatusIcon = status.icon;
                const customerDisplayName =
                  conv.customer?.name || (conv.customer?.phone ? `Khách ${conv.customer.phone}` : `Khách Zalo #${conv.id.substring(0, 6).toUpperCase()}`);
                const hasImageLastMsg = !!conv.lastMessage?.imageUrl;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`p-3 transition-colors cursor-pointer relative flex items-start gap-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 min-w-0 ${
                      isSelected
                        ? "bg-neutral-100 dark:bg-neutral-800 border-l-2 border-l-[#17c1e8]"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-9 h-9 border border-neutral-200 dark:border-neutral-800">
                        <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-mono font-medium">
                          {customerDisplayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Active Status Dot */}
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
                        style={{ backgroundColor: status.color }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-semibold text-xs truncate ${
                            isSelected ? "text-neutral-900 dark:text-neutral-100 font-bold" : "text-foreground"
                          }`}
                        >
                          {customerDisplayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 font-mono">
                          {formatDistanceToNow(new Date(conv.updatedAt ?? conv.createdAt), {
                            addSuffix: false,
                            locale: vi,
                          })}
                        </span>
                      </div>

                      {/* Phone & Channel Tag */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground truncate font-mono">
                          {conv.customer?.phone || conv.zaloUserId}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      <p className="text-[11px] text-muted-foreground/90 truncate mt-1">
                        {hasImageLastMsg ? (
                          <span className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300 font-medium font-mono">
                            <ImageIcon className="w-3 h-3" /> [Hình ảnh]
                          </span>
                        ) : (
                          conv.lastMessage?.content || "Chưa có tin nhắn"
                        )}
                      </p>

                      {/* Status Tag Pill */}
                      <div className="flex items-center justify-between mt-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-4 gap-0.5 font-mono ${status.className}`}
                        >
                          <StatusIcon className="w-2.5 h-2.5" />
                          {status.label}
                        </Badge>
                        {conv.customer?.tier && conv.customer.tier !== "standard" && (
                          <Badge variant="secondary" className="text-[9px] uppercase font-mono font-bold tracking-wider h-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-1">
                            {conv.customer.tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ACTIVE LIVE CHAT WINDOW ================= */}
        <div className="flex-1 min-h-0 flex flex-col bg-background/50 min-w-0 h-full overflow-hidden">
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 min-w-0 z-10 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="w-9 h-9 border border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                    <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-medium text-xs">
                      {(activeConversation.customer?.name || "K").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-bold text-sm sm:text-base text-foreground truncate">
                        {activeConversation.customer?.name ||
                          (activeConversation.customer?.phone
                            ? `Khách ${activeConversation.customer.phone}`
                            : `Khách Zalo #${activeConversation.id.substring(0, 6).toUpperCase()}`)}
                      </h2>
                      {activeConversation.customer?.tier && (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-mono font-medium text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 px-1 py-0"
                        >
                          {activeConversation.customer.tier}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activeConversation.customer?.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          {activeConversation.customer.phone}
                        </span>
                      )}
                      <span className="truncate hidden sm:inline font-mono">Zalo ID: {activeConversation.zaloUserId}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Tools: Mode Switcher & Close */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Mode Toggle Button */}
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() =>
                        toggleModeMutation.mutate({
                          id: activeConversation.id,
                          isHumanMode: false,
                        })
                      }
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        !activeConversation.isHumanMode
                          ? "bg-[#17c1e8] text-slate-950 font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">AI tự động</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toggleModeMutation.mutate({
                          id: activeConversation.id,
                          isHumanMode: true,
                        })
                      }
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        activeConversation.isHumanMode
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Nhân viên tiếp quản</span>
                    </button>
                  </div>

                  {/* Close / Reopen button */}
                  {activeConversation.status === "closed" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => reopenConversationMutation.mutate(activeConversation.id)}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Mở lại
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10"
                      onClick={() => closeConversationMutation.mutate(activeConversation.id)}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Đóng
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat Message History Area (Customer = LEFT, Shop [AI & Staff] = RIGHT) */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-3.5 custom-scrollbar min-w-0 overscroll-contain">
                {isLoadingMessages ? (
                  <div className="space-y-4 p-4">
                    <Skeleton className="h-14 w-1/2 rounded-2xl" />
                    <Skeleton className="h-16 w-3/5 ml-auto rounded-2xl" />
                    <Skeleton className="h-14 w-2/3 ml-auto rounded-2xl" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Bot className="w-8 h-8 text-neutral-400 opacity-40 mb-2" />
                    <p className="text-sm font-medium">Chưa có tin nhắn trong hội thoại này</p>
                    <p className="text-xs opacity-70">Gõ tin nhắn bên dưới để bắt đầu tư vấn khách hàng</p>
                  </div>
                ) : (
                  messages.filter((m) => !deletedForMeIds.includes(m.id)).map((msg, index) => {
                    const isStaff = msg.role === "staff";
                    const isAI = msg.role === "assistant";
                    const isShopSide = isStaff || isAI; // AI & Staff are both SHOP SIDE -> RIGHT
                    const isRecalled = msg.content === "[Tin nhắn đã được thu hồi]";
                    const isEditing = editingMessageId === msg.id;

                    const formattedImageUrl = getValidImageUrl(msg.imageUrl);

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex gap-2.5 max-w-[85%] group relative ${
                          isShopSide ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                        }`}
                      >
                        {/* Avatar */}
                        <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5 border border-neutral-200 dark:border-neutral-800">
                          {isAI ? (
                            <img src="/ai-avatar.png" alt="AI" className="w-full h-full object-cover rounded-full" />
                          ) : isStaff ? (
                            <AvatarFallback className="bg-[#17c1e8] text-slate-950 font-mono font-bold text-xs">
                              FS
                            </AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-mono font-medium">
                              {(activeConversation.customer?.name || "K").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        {/* Bubble Container */}
                        <div className="space-y-1 min-w-0 flex-1 relative">
                          {/* Floating Hover Action Toolbar */}
                          {!isRecalled && !isEditing && (
                            <div
                              className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 ${
                                isShopSide ? "right-1" : "left-1"
                              } z-10 flex items-center gap-0.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border border-neutral-700/80 rounded-md p-0.5 shadow-sm`}
                            >
                              {isShopSide && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingText(msg.content);
                                    }}
                                    className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors"
                                    title="Chỉnh sửa tin nhắn"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRecallMessage(msg.id)}
                                    className="p-1 hover:text-amber-400 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors"
                                    title="Thu hồi tin nhắn (2 phía)"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteForMe(msg.id)}
                                className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors"
                                title="Xóa ở phía tôi (1 phía)"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHardDeleteMessage(msg.id)}
                                className="p-1 hover:text-rose-400 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors"
                                title="Xóa ở cả 2 phía (Xóa vĩnh viễn)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Sender Label */}
                          <div
                            className={`flex items-center gap-1.5 text-[11px] ${
                              isShopSide ? "justify-end text-neutral-700 dark:text-neutral-300 font-mono" : "text-muted-foreground font-mono"
                            }`}
                          >
                            <span className="font-semibold">
                              {isShopSide ? "Fashion Shop" : activeConversation.customer?.name || "Khách hàng"}
                            </span>
                            <span>•</span>
                            <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                          </div>

                          {/* Message Content Container / Inline Edit */}
                          {isEditing ? (
                            <div className="w-full space-y-1.5 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm">
                              <textarea
                                rows={2}
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === "Escape") {
                                    setEditingMessageId(null);
                                  }
                                }}
                                placeholder="Nhập nội dung chỉnh sửa... (Enter để lưu, Esc để hủy)"
                                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md p-2 text-xs text-neutral-900 dark:text-neutral-100 resize-none focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                              />
                              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                                <span className="text-[10px] text-neutral-400 italic">Enter để Lưu • Esc để Hủy</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                                    onClick={() => setEditingMessageId(null)}
                                  >
                                    Hủy
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-[10px] bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] font-bold rounded-md shadow-sm"
                                    onClick={() => handleSaveEdit(msg.id)}
                                  >
                                    Lưu
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] ${
                                isRecalled
                                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 italic border border-dashed border-neutral-300 dark:border-neutral-700"
                                  : isShopSide
                                  ? "bg-[#17c1e8] text-slate-950 font-medium rounded-tr-none shadow-sm"
                                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-none border border-neutral-200 dark:border-neutral-700"
                              }`}
                            >
                              {/* Attached Image with fallback */}
                              {formattedImageUrl && !isRecalled && (
                                <div className="mb-2 relative group cursor-pointer overflow-hidden rounded-xl max-w-xs border border-border/30 bg-black/40">
                                  <img
                                    src={formattedImageUrl}
                                    alt="Hình ảnh đính kèm"
                                    className="w-full h-auto max-h-56 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                                    onClick={() => setPreviewImage(formattedImageUrl)}
                                    onError={(e) => {
                                      // Fallback if image load fails
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <div
                                    onClick={() => setPreviewImage(formattedImageUrl)}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs gap-1 font-medium"
                                  >
                                    <Maximize2 className="w-4 h-4" /> Phóng to ảnh
                                  </div>
                                </div>
                              )}

                              {/* Text Content */}
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Staff Reply Composer */}
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-md space-y-2 shrink-0 z-10">
                {/* AI Active Warning / Notice */}
                {!activeConversation.isHumanMode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                    <Bot className="w-3.5 h-3.5 flex-shrink-0 text-neutral-500" />
                    <span>
                      <strong>AI đang tự động xử lý.</strong> Khi gửi tin nhắn, hệ thống sẽ chuyển sang quyền <strong>Nhân viên</strong>.
                    </span>
                  </div>
                )}

                {/* Quick Canned Response Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                  <span className="text-neutral-500 whitespace-nowrap text-[11px] font-mono font-medium mr-1">
                    Gợi ý nhanh:
                  </span>
                  {QUICK_RESPONSES.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(chip)}
                      className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 whitespace-nowrap transition-colors text-[11px] font-mono"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Attached Image Preview */}
                {attachedImage && (
                  <div className="relative inline-block border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-900 p-1">
                    <img src={getValidImageUrl(attachedImage) || attachedImage} alt="Ảnh đính kèm" className="h-16 w-auto object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-1 right-1 bg-neutral-900 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Form Input */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 flex-shrink-0 border-neutral-200 dark:border-neutral-800 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title="Gửi hình ảnh mẫu hoặc ảnh sản phẩm"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  {/* Text Input (Auto-resizing Textarea) */}
                  <textarea
                    ref={staffTextareaRef}
                    rows={1}
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Nhập tin nhắn phản hồi của nhân viên (Nhấn Enter để gửi, Shift+Enter xuống dòng)..."
                    className="flex-1 min-h-[38px] max-h-[120px] py-2 px-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none resize-none custom-scrollbar leading-relaxed"
                  />

                  {/* Send Button */}
                  <Button
                    type="submit"
                    disabled={(!replyText.trim() && !attachedImage) || sendReplyMutation.isPending}
                    className="h-9 px-3 sm:px-4 bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] rounded-md font-bold text-xs sm:text-sm shrink-0 self-end shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 mr-1 text-slate-950" />
                    <span className="hidden sm:inline">Gửi</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 border border-neutral-200 dark:border-neutral-800">
                <MessageSquare className="w-6 h-6 text-neutral-400 opacity-60" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">
                Chọn một hội thoại để quản lý
              </h3>
              <p className="text-xs max-w-sm">
                Xem tin nhắn của khách hàng từ Zalo, theo dõi phản hồi của AI và trực tiếp trả lời khách hàng.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Dialog to Zoom In on Image Attachments */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl bg-black/95 border-border/40 p-2 flex items-center justify-center">
          {previewImage && (
            <img
              src={previewImage}
              alt="Xem ảnh lớn"
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
