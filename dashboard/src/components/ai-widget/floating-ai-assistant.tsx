"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Minimize2, Loader2, ImagePlus, X, Image as ImageIcon, Pencil, RotateCcw, Trash2, Check, EyeOff, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { toast } from "sonner";
import apiClient from "@/lib/api";
import { authService, type UnifiedUser } from "@/lib/auth";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  imageUrl?: string;
  time: string;
}

const BOT_POS_KEY = "fashion_ai_bot_position";

function getPersistentUserId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id) return currentUser.id;
    let guestId = localStorage.getItem("fs_guest_user_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("fs_guest_user_id", guestId);
    }
    return guestId;
  } catch {
    return "guest";
  }
}

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [input, setInput] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("fs_deleted_for_me");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "Dạ em chào anh/chị ạ! Em là Trợ Lý AI của Fashion Shop ✨ Em có thể giúp gì cho mình về tư vấn chọn size, tìm mẫu áo quần theo hình ảnh hay kiểm tra đơn hàng ạ?",
      time: "Vừa xong",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());

    // Restore saved position safely
    try {
      const saved = localStorage.getItem(BOT_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x >= 0 &&
          parsed.x <= window.innerWidth - 80 &&
          parsed.y >= 0 &&
          parsed.y <= window.innerHeight - 80
        ) {
          setPosition(parsed);
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = () => {
      const targetUserId = getPersistentUserId();
      apiClient
        .get<{ messages: any[] }>("/chat/history", {
          params: { userId: targetUserId, role: user?.role || "customer" },
        })
        .then(({ data }) => {
          if (data?.messages && data.messages.length > 0) {
            setMessages((prev) => {
              if (
                prev.length === data.messages.length &&
                prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id
              ) {
                return prev;
              }
              return data.messages.map((m: any) => ({
                id: m.id,
                sender: m.role === "assistant" || m.role === "staff" ? "ai" : "user",
                text: m.content,
                imageUrl: m.imageUrl,
                time: m.createdAt
                  ? format(new Date(m.createdAt), "HH:mm", { locale: vi })
                  : "Vừa xong",
              }));
            });
          }
        })
        .catch(() => { });
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 2000);
    return () => clearInterval(interval);
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen, isSending]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // If chat is open, do not drag - click will close it!
    if (isOpen) return;
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      initialPos.current = { x: rect.left, y: rect.top };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    if (!hasMovedRef.current && Math.hypot(deltaX, deltaY) > 8) {
      hasMovedRef.current = true;
      setIsDragging(true);
      if (dragRef.current) {
        try {
          dragRef.current.setPointerCapture(e.pointerId);
        } catch { }
      }
    }

    if (hasMovedRef.current) {
      const maxX = window.innerWidth - 72;
      const maxY = window.innerHeight - 72;

      const newX = Math.min(Math.max(12, initialPos.current.x + deltaX), maxX);
      const newY = Math.min(Math.max(12, initialPos.current.y + deltaY), maxY);

      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      if (dragRef.current) {
        try {
          dragRef.current.releasePointerCapture(e.pointerId);
        } catch { }
      }

      if (hasMovedRef.current && position) {
        localStorage.setItem(BOT_POS_KEY, JSON.stringify(position));
      }
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedImage({ file, previewUrl });
    }
  };

  const handleRemoveImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const previewUrl = URL.createObjectURL(file);
          setSelectedImage({ file, previewUrl });
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleDeleteForMe = (msgId: string) => {
    const updated = [...deletedForMeIds, msgId];
    setDeletedForMeIds(updated);
    try {
      localStorage.setItem("fs_deleted_for_me", JSON.stringify(updated));
    } catch { }
    toast.success("Đã xóa tin nhắn ở phía bạn (1 phía)");
  };

  const handleRecallMessage = async (msgId: string) => {
    try {
      await apiClient.delete(`/chat/messages/${msgId}?recall=true`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, text: "[Tin nhắn đã được thu hồi]", imageUrl: undefined } : m
        )
      );
      toast.success("Đã thu hồi tin nhắn (2 phía)");
    } catch {
      toast.error("Không thể thu hồi tin nhắn");
    }
  };

  const handleHardDeleteMessage = async (msgId: string) => {
    try {
      await apiClient.delete(`/chat/messages/${msgId}?recall=false`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success("Đã xóa tin nhắn ở cả 2 phía");
    } catch {
      toast.error("Không thể xóa tin nhắn");
    }
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await apiClient.put(`/chat/messages/${msgId}`, { content: editingText.trim() });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: editingText.trim() } : m))
      );
      setEditingMessageId(null);
      toast.success("Đã cập nhật tin nhắn");
    } catch {
      toast.error("Không thể chỉnh sửa tin nhắn");
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedImage) || isSending) return;

    const userText = input.trim();
    const imageToUpload = selectedImage;
    const currentPreviewUrl = selectedImage?.previewUrl;

    // Reset input immediately
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userText || "Tìm kiếm sản phẩm qua hình ảnh",
      imageUrl: currentPreviewUrl,
      time: format(new Date(), "HH:mm", { locale: vi }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      let uploadedUrl: string | undefined = undefined;

      if (imageToUpload?.file) {
        const formData = new FormData();
        formData.append("file", imageToUpload.file);

        const uploadRes = await apiClient.post<{ imageUrl: string }>(
          "/chat/upload-image",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        uploadedUrl = uploadRes.data?.imageUrl;
      }

      const targetUserId = getPersistentUserId();
      const res = await apiClient.post<{ reply: string }>("/chat/send", {
        message: userText || "Tìm kiếm sản phẩm qua hình ảnh",
        imageUrl: uploadedUrl,
        userId: targetUserId,
        role: user?.role || "customer",
      });

      if (res.data?.reply) {
        const aiReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: res.data.reply,
          time: format(new Date(), "HH:mm", { locale: vi }),
        };
        setMessages((prev) => [...prev, aiReply]);
      }
    } catch {
      const errorReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Dạ hiện tại kết nối đang gián đoạn một chút, em sẽ hỗ trợ anh/chị ngay nhé!",
        time: format(new Date(), "HH:mm", { locale: vi }),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsSending(false);
    }
  };

  const containerStyle: React.CSSProperties = position
    ? {
      position: "fixed",
      left: `${position.x}px`,
      top: `${position.y}px`,
      zIndex: 9999,
      touchAction: "none",
    }
    : {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      zIndex: 9999,
      touchAction: "none",
    };

  const getChatWindowStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") {
      return { position: "fixed", right: "24px", bottom: "88px", zIndex: 9999 };
    }

    const chatWidth = window.innerWidth < 640 ? 320 : 384;

    if (!position) {
      return {
        position: "fixed",
        right: "24px",
        bottom: "88px",
        maxHeight: "500px",
        zIndex: 9999,
      };
    }

    let left = position.x - chatWidth + 56;
    if (left < 16) left = Math.min(position.x, window.innerWidth - chatWidth - 16);
    if (left + chatWidth > window.innerWidth - 16) left = window.innerWidth - chatWidth - 16;
    if (left < 16) left = 16;

    // If button is dragged near top of screen, display chat below button
    const isNearTop = position.y < 300;
    if (isNearTop) {
      return {
        position: "fixed",
        left: `${left}px`,
        top: `${position.y + 68}px`,
        maxHeight: `calc(100vh - ${position.y + 84}px)`,
        zIndex: 9999,
      };
    }

    // Default: anchor by bottom so bottom of chat box is ALWAYS exactly 12px above button
    const bottomDistance = window.innerHeight - position.y + 12;

    return {
      position: "fixed",
      left: `${left}px`,
      bottom: `${bottomDistance}px`,
      maxHeight: `min(500px, calc(${position.y}px - 24px))`,
      zIndex: 9999,
    };
  };

  return (
    <>
      {/* Floating AI Launcher Button */}
      <div
        style={containerStyle}
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleButtonClick}
        className="select-none"
      >
        <button
          type="button"
          className={`relative group cursor-grab active:cursor-grabbing transition-transform duration-200 outline-none ${isDragging ? "scale-105" : "hover:scale-105 active:scale-95"
            }`}
          title={isOpen ? "Đóng trợ lý AI" : "Mở trợ lý AI tư vấn"}
        >
          {/* 3D AI Assistant Floating Avatar Action Button */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#17c1e8] via-[#48d2f0] to-[#80e5f9] p-[2.5px] shadow-xl hover:shadow-[#17c1e8]/30 transition-all">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
              {isOpen ? (
                <X className="w-6 h-6 text-[#17c1e8] stroke-[2.5]" />
              ) : (
                <img
                  src="/ai-avatar.png"
                  alt="Fashion AI Assistant"
                  className="w-full h-full object-cover rounded-full pointer-events-none"
                />
              )}
            </div>
            {!isOpen && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 ring-2 ring-emerald-500/30" />
            )}
          </div>

          {/* Floating Tooltip */}
          {!isOpen && !isDragging && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#17c1e8] text-slate-950 border border-[#17c1e8]/40 text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-sm pointer-events-none flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-slate-950" />
              Hỗ trợ
            </div>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={getChatWindowStyle()}
          className="w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80">
            <div className="flex items-center gap-2.5">
              <img
                src="/ai-avatar.png"
                alt="Fashion AI Assistant"
                className="w-8 h-8 rounded-full border border-[#17c1e8]/50 object-cover shadow-xs"
              />
              <div>
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-none">
                  FASHION SHOP AI
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-none">
                    Tư vấn trực tuyến
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 pb-2 overflow-y-auto overflow-x-hidden space-y-3 max-h-[360px] text-xs custom-scrollbar">
            {messages.filter((m) => !deletedForMeIds.includes(m.id)).map((msg) => {
              const isUser = msg.sender === "user";
              const isRecalled = msg.text === "[Tin nhắn đã được thu hồi]";
              const isEditing = editingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group relative ${isUser ? "items-end" : "items-start"
                    }`}
                >
                  {/* Floating Action Menu on Hover */}
                  {!isRecalled && !isEditing && (
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 ${isUser ? "right-2" : "left-2"
                        } z-10 flex items-center gap-0.5 bg-slate-900/95 border border-slate-700/80 rounded-lg p-0.5 shadow-lg backdrop-blur-sm`}
                    >
                      {isUser && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingText(msg.text);
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Chỉnh sửa tin nhắn"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRecallMessage(msg.id)}
                            className="p-1 text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Thu hồi tin nhắn (2 phía)"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteForMe(msg.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                        title="Xóa ở phía tôi (1 phía)"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHardDeleteMessage(msg.id)}
                        className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                        title="Xóa ở cả 2 phía (Xóa vĩnh viễn)"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="w-full max-w-[90%] space-y-1.5 p-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm">
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
                        placeholder="Nhập nội dung sửa... (Enter để lưu, Esc để hủy)"
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
                            className="h-6 px-2 text-[10px] bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 font-medium rounded-md shadow-sm"
                            onClick={() => handleSaveEdit(msg.id)}
                          >
                            Lưu
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-lg px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] ${isRecalled
                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 italic border border-dashed border-neutral-300 dark:border-neutral-700"
                          : isUser
                            ? "bg-[#17c1e8] text-slate-950 font-medium rounded-tr-none shadow-sm"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-none border border-neutral-200 dark:border-neutral-700/80"
                        }`}
                    >
                      {/* Attached Image inside Bubble */}
                      {msg.imageUrl && !isRecalled && (
                        <div className="mb-2 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-950/20">
                          <img
                            src={msg.imageUrl}
                            alt="Hình ảnh gửi kèm"
                            className="max-h-48 w-full object-cover rounded-md hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onClick={() => window.open(msg.imageUrl, "_blank")}
                            onLoad={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                          />
                        </div>
                      )}
                      {msg.text}
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-neutral-400 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              );
            })}
            {isSending && (
              <div className="flex items-start">
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg rounded-tl-none px-3 py-2 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-300 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-300 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-300 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4 shrink-0" />
          </div>

          {/* Staged Image Preview */}
          {selectedImage && (
            <div className="px-3 pt-2 pb-1 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm bg-neutral-100 dark:bg-neutral-900">
                  <img
                    src={selectedImage.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[180px]">
                    {selectedImage.file.name}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Sẵn sàng tìm kiếm
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Bỏ ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-border/40 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Upload Image Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className={`h-9 w-9 rounded-md shrink-0 transition-colors ${selectedImage
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700"
                  : "text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              title="Tải ảnh lên để tìm kiếm sản phẩm"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              onPaste={handlePaste}
              placeholder={selectedImage ? "Thêm ghi chú..." : "Nhắn tin hoặc gửi ảnh tìm đồ..."}
              disabled={isSending}
              className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 text-xs min-h-[36px] max-h-[120px] py-2 px-3 rounded-md focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none flex-1 resize-none custom-scrollbar leading-relaxed"
            />

            <Button
              type="submit"
              size="icon"
              disabled={isSending || (!input.trim() && !selectedImage)}
              className="h-9 w-9 bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] rounded-md shrink-0 font-bold self-end shadow-sm"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Send className="w-4 h-4 text-slate-950" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
