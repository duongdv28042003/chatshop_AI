"use client";

import { useState, useEffect } from "react";
import { Settings, Key, Bot, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authService } from "@/lib/auth";

export default function SettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsAdmin(authService.isAdmin());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Settings className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-medium">Bạn không có quyền truy cập trang này</p>
        <p className="text-sm mt-1">Chỉ Admin mới có thể cài đặt hệ thống</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình hệ thống và tích hợp</p>
      </div>

      {}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-400" />
            Zalo OA Integration
          </CardTitle>
          <CardDescription>Kết nối với tài khoản Zalo Official Account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Zalo OA Access Token</label>
            <Input
              type="password"
              placeholder="OA token từ Zalo for Developers"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Webhook URL</label>
            <Input
              readOnly
              value="https://yourdomain.com/webhook/zalo"
              className="bg-muted/50 text-muted-foreground font-mono text-sm"
            />
          </div>
          <Button className="bg-gradient-to-r from-violet-500 to-blue-500 text-white">
            Lưu cấu hình
          </Button>
        </CardContent>
      </Card>

      {}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-400" />
            Cấu hình AI Agent
          </CardTitle>
          <CardDescription>Điều chỉnh hành vi của chatbot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Model LLM</label>
            <Input defaultValue="ollama/qwen3.5:9b" className="bg-muted/50" />
          </div>
          <Button variant="outline">Lưu cấu hình AI</Button>
        </CardContent>
      </Card>

      <Separator className="border-border/40" />

      {}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Quản lý nhân viên
          </CardTitle>
          <CardDescription>Thêm và phân quyền tài khoản nhân viên</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            Quản lý nhân viên →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
