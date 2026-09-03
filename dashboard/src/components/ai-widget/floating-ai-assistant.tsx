"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Minimize2, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import { authService, type UnifiedUser } from "@/lib/auth";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
}

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [input, setInput] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "Dạ em chào anh/chị ạ! Em là Trợ Lý AI của Fashion Shop ✨ Em có thể giúp gì cho mình về tư vấn chọn size, tìm mẫu áo quần hay kiểm tra đơn hàng ạ?",
      time: "Vừa xong",
    },
  ]);

  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());
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
              time: m.createdAt
                ? format(new Date(m.createdAt), "HH:mm", { locale: vi })
                : "Vừa xong",
            }));
            setMessages(formatted);
          }
        })
        .catch(() => {

        });
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth - 100,
        y: window.innerHeight - 110,
      });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { x: position.x, y: position.y };

    if (dragRef.current) {
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

    setPosition({
      x: Math.min(Math.max(10, initialPos.current.x + deltaX), maxX),
      y: Math.min(Math.max(10, initialPos.current.y + deltaY), maxY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (dragRef.current) {
      dragRef.current.releasePointerCapture(e.pointerId);
    }

    if (!hasMoved.current) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      time: format(new Date(), "HH:mm", { locale: vi }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const { data } = await apiClient.post<{ reply: string }>("/chat/send", {
        userId: user?.id || "guest_user",
        role: user?.role || "customer",
        message: userText,
      });

      const aiReplyText = data.reply || "Dạ em đã nhận được tin nhắn của mình rồi ạ!";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: aiReplyText,
          time: format(new Date(), "HH:mm", { locale: vi }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Dạ em đang kiểm tra kho hàng và tư vấn cho mình ngay đây ạ 💕",
          time: format(new Date(), "HH:mm", { locale: vi }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: "none",
      }}
      className="select-none"
    >
      {}
      <div
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative group cursor-grab active:cursor-grabbing transition-transform duration-200 ${
          isDragging ? "scale-105" : "hover:scale-110"
        }`}
      >
        {}
        <div className="absolute -inset-2 bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 rounded-full blur-lg opacity-60 group-hover:opacity-90 animate-pulse transition duration-500" />

        {}
        <div className="relative flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-white via-slate-50 to-violet-100 border-2 border-white shadow-xl shadow-violet-500/20">
          {}
          <div className="absolute -left-1.5 w-2 h-5 bg-gradient-to-b from-violet-400 to-pink-400 rounded-full shadow-sm" />
          <div className="absolute -right-1.5 w-2 h-5 bg-gradient-to-b from-violet-400 to-pink-400 rounded-full shadow-sm" />

          {}
          <div className="absolute -top-2 flex flex-col items-center">
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
            <div className="w-0.5 h-1.5 bg-slate-300" />
          </div>

          {}
          <div className="relative w-11 h-9 rounded-2xl bg-gradient-to-b from-slate-900 to-indigo-950 flex flex-col items-center justify-center p-1 shadow-inner border border-slate-700/50">
            {}
            <div className="flex items-center gap-2.5">
              {isBlinking ? (
                <>
                  <div className="w-2.5 h-0.5 bg-cyan-300 rounded-full" />
                  <div className="w-2.5 h-0.5 bg-cyan-300 rounded-full" />
                </>
              ) : (
                <>
                  <div className="relative w-2.5 h-3 bg-cyan-300 rounded-full shadow-[0_0_6px_#67e8f9] flex items-start justify-end pr-0.5 pt-0.5">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div className="relative w-2.5 h-3 bg-cyan-300 rounded-full shadow-[0_0_6px_#67e8f9] flex items-start justify-end pr-0.5 pt-0.5">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </>
              )}
            </div>

            {}
            <div className="flex items-center justify-between w-full px-1.5 mt-0.5">
              <div className="w-1.5 h-0.5 bg-pink-400/80 rounded-full blur-[0.5px]" />
              <div className="w-2 h-1 border-b-2 border-cyan-200 rounded-full" />
              <div className="w-1.5 h-0.5 bg-pink-400/80 rounded-full blur-[0.5px]" />
            </div>
          </div>

          {}
          <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
          </span>
        </div>

        {}
        {!isOpen && !isDragging && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 text-slate-800 border border-violet-200 text-xs font-semibold px-3 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-1.5 animate-bounce">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Hỏi AI tư vấn nha!
          </div>
        )}
      </div>

      {}
      {isOpen && (
        <div
          className="absolute right-0 bottom-20 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-violet-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-violet-500/10 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ maxHeight: "500px" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-500/10 via-pink-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-md shadow-violet-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Bé Trợ Lý AI
                  <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                </p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {user ? `Đang chat với: ${user.fullName || user.name || "Khách hàng"}` : "Luôn sẵn sàng hỗ trợ"}
                </span>
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

          {}
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
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-violet-500/20"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                <span>Bé AI đang suy nghĩ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn tin với bé AI nha..."
              disabled={isSending}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-10 rounded-2xl focus:border-violet-500 shadow-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSending || !input.trim()}
              className="h-10 w-10 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white rounded-2xl shadow-md shadow-violet-500/25 shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
