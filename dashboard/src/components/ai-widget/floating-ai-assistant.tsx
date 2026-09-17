"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Minimize2, Loader2, ImagePlus, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
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

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [input, setInput] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "Dạ em chào anh/chị ạ! Em là Trợ Lý AI của Fashion Shop ✨ Em có thể giúp gì cho mình về tư vấn chọn size, tìm mẫu áo quần theo hình ảnh hay kiểm tra đơn hàng ạ?",
      time: "Vừa xong",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
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
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen && user?.id) {
      apiClient
        .get<{ messages: any[] }>("/chat/history", {
          params: { userId: user.id, role: user.role },
        })
        .then(({ data }) => {
          if (data?.messages && data.messages.length > 0) {
            const formatted: ChatMessage[] = data.messages.map((m) => ({
              id: m.id,
              sender: m.role === "assistant" ? "ai" : "user",
              text: m.content,
              imageUrl: m.imageUrl,
              time: m.createdAt
                ? format(new Date(m.createdAt), "HH:mm", { locale: vi })
                : "Vừa xong",
            }));
            setMessages(formatted);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      initialPos.current = { x: rect.left, y: rect.top };
      setPosition({ x: rect.left, y: rect.top });
      dragRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    if (Math.hypot(deltaX, deltaY) > 5) {
      hasMoved.current = true;
    }

    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;

    const newX = Math.min(Math.max(10, initialPos.current.x + deltaX), maxX);
    const newY = Math.min(Math.max(10, initialPos.current.y + deltaY), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (dragRef.current) {
      dragRef.current.releasePointerCapture(e.pointerId);
    }

    if (hasMoved.current && position) {
      localStorage.setItem(BOT_POS_KEY, JSON.stringify(position));
    }

    if (!hasMoved.current) {
      setIsOpen((prev) => !prev);
    }
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isSending) return;

    const userText = input.trim();
    const imageToUpload = selectedImage;
    const currentPreviewUrl = selectedImage?.previewUrl;

    // Reset input immediately
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

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

      const res = await apiClient.post<{ reply: string }>("/chat/send", {
        message: userText || "Tìm kiếm sản phẩm qua hình ảnh",
        imageUrl: uploadedUrl,
        userId: user?.id || "guest",
        role: user?.role || "customer",
      });

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.data?.reply || "Dạ em đã nhận được yêu cầu của mình rồi ạ!",
        time: format(new Date(), "HH:mm", { locale: vi }),
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch {
      const errorReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Dạ hiện tại hệ thống AI đang bận một chút, em sẽ hỗ trợ anh/chị ngay nhé!",
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

  return (
    <div style={containerStyle} className="select-none">
      {/* Robot Head Button */}
      <div
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative group cursor-grab active:cursor-grabbing transition-transform duration-200 ${
          isDragging ? "scale-105" : "hover:scale-110"
        }`}
      >
        {/* Outer Tech Glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-[#17c1e8] via-cyan-400 to-blue-500 rounded-full blur-lg opacity-60 group-hover:opacity-90 animate-pulse transition duration-500" />

        {/* Robot Head Body */}
        <div className="relative flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-[#17c1e8]/60 shadow-xl shadow-[#17c1e8]/20">
          {/* Side Ears */}
          <div className="absolute -left-1.5 w-2 h-5 bg-gradient-to-b from-[#17c1e8] to-cyan-600 rounded-full shadow-sm" />
          <div className="absolute -right-1.5 w-2 h-5 bg-gradient-to-b from-[#17c1e8] to-cyan-600 rounded-full shadow-sm" />

          {/* Top Antenna */}
          <div className="absolute -top-2 flex flex-col items-center">
            <div className="w-1.5 h-1.5 bg-[#17c1e8] rounded-full animate-bounce" />
            <div className="w-0.5 h-1.5 bg-cyan-600" />
          </div>

          {/* Face Screen */}
          <div className="relative w-11 h-9 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-1 shadow-inner border border-[#17c1e8]/30">
            {/* Glowing Eyes */}
            <div className="flex items-center gap-2.5">
              {isBlinking ? (
                <>
                  <div className="w-2.5 h-0.5 bg-[#17c1e8] rounded-full shadow-[0_0_6px_#17c1e8]" />
                  <div className="w-2.5 h-0.5 bg-[#17c1e8] rounded-full shadow-[0_0_6px_#17c1e8]" />
                </>
              ) : (
                <>
                  <div className="relative w-2.5 h-3 bg-[#17c1e8] rounded-full shadow-[0_0_8px_#17c1e8] flex items-start justify-end pr-0.5 pt-0.5">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div className="relative w-2.5 h-3 bg-[#17c1e8] rounded-full shadow-[0_0_8px_#17c1e8] flex items-start justify-end pr-0.5 pt-0.5">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </>
              )}
            </div>

            {/* Mouth */}
            <div className="flex items-center justify-center w-full px-1.5 mt-0.5">
              <div className="w-3 h-1 border-b-2 border-[#17c1e8] rounded-full shadow-[0_0_4px_#17c1e8]" />
            </div>
          </div>

          {/* Online Indicator */}
          <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#17c1e8] opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#17c1e8] border-2 border-slate-900" />
          </span>
        </div>

        {/* Floating Bubble Tooltip */}
        {!isOpen && !isDragging && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-[#17c1e8] border border-[#17c1e8]/30 text-xs font-semibold px-3 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-1.5 animate-bounce">
            <Sparkles className="w-3 h-3 text-[#17c1e8]" />
            Trợ lý AI tư vấn
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="absolute right-0 bottom-20 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-[#17c1e8]/30 rounded-3xl shadow-2xl shadow-[#17c1e8]/10 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ maxHeight: "500px" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-[#17c1e8]/15 via-cyan-950/20 to-transparent">
            <div className="flex items-center gap-2.5">
              <BrandLogo showText={false} size="sm" />
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">
                  FASHION SHOP
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-[#17c1e8] font-semibold leading-none">
                    Trực tuyến • Tư vấn 24/7
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
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[320px] text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-[#17c1e8] to-cyan-600 text-slate-950 font-medium rounded-tr-none shadow-md shadow-[#17c1e8]/20"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  {/* Attached Image inside Bubble */}
                  {msg.imageUrl && (
                    <div className="mb-2 overflow-hidden rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-950/20">
                      <img
                        src={msg.imageUrl}
                        alt="Hình ảnh gửi kèm"
                        className="max-h-48 w-full object-cover rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer"
                        onClick={() => window.open(msg.imageUrl, "_blank")}
                      />
                    </div>
                  )}
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}
            {isSending && (
              <div className="flex items-start">
                <div className="bg-slate-100 dark:bg-slate-800/90 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#17c1e8] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#17c1e8] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#17c1e8] animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Staged Image Preview */}
          {selectedImage && (
            <div className="px-3 pt-2 pb-1 bg-slate-100/80 dark:bg-slate-950/60 border-t border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#17c1e8]/50 shadow-sm bg-slate-900">
                  <img
                    src={selectedImage.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                    {selectedImage.file.name}
                  </span>
                  <span className="text-[10px] text-[#17c1e8] font-medium flex items-center gap-1">
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
              className={`h-10 w-10 rounded-2xl shrink-0 transition-colors ${
                selectedImage
                  ? "bg-[#17c1e8]/20 text-[#17c1e8] border border-[#17c1e8]/50"
                  : "text-slate-400 hover:text-[#17c1e8] hover:bg-[#17c1e8]/10"
              }`}
              title="Tải ảnh lên để tìm kiếm sản phẩm bằng AI"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={selectedImage ? "Thêm ghi chú (tùy chọn)..." : "Nhắn tin hoặc gửi ảnh tìm đồ..."}
              disabled={isSending}
              className="bg-white dark:bg-slate-800 border-border/60 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-10 rounded-2xl focus:border-[#17c1e8] shadow-sm flex-1"
            />

            <Button
              type="submit"
              size="icon"
              disabled={isSending || (!input.trim() && !selectedImage)}
              className="h-10 w-10 bg-gradient-to-r from-[#17c1e8] to-cyan-600 hover:from-cyan-400 hover:to-[#17c1e8] text-slate-950 rounded-2xl shadow-md shadow-[#17c1e8]/25 shrink-0 font-bold"
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
    </div>
  );
}
