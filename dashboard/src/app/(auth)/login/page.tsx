"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ShoppingBag, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authService } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z.string().min(1, "Vui lòng nhập Email hoặc Số điện thoại"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setLoading(true);
    try {
      const res: any = await authService.login({
        email: values.identifier,
        identifier: values.identifier,
        password: values.password,
      });

      const role = res.role || res.user?.role || "staff";
      const name = res.user?.fullName || res.user?.name || res.staff?.fullName || "bạn";

      if (role === "customer") {
        toast.success(`Đăng nhập thành công! Chào mừng khách hàng ${name}.`);
      } else {
        toast.success(`Đăng nhập thành công với quyền ${role}!`);
      }

      router.push("/");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 mb-3 shadow-lg shadow-violet-500/25">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Fashion Shop</h1>
          <p className="text-slate-400 text-sm mt-1">
          </p>
        </div>

        {}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      Email hoặc Số điện thoại
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nhập email hoặc số điện thoại..."
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-500"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Mật khẩu</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-500"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white font-medium h-11 rounded-xl shadow-lg shadow-violet-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Đăng nhập
                  </>
                )}
              </Button>
            </form>
          </Form>

          {}
          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center text-sm text-slate-400">
            Bạn là khách hàng mới?{" "}
            <Link
              href="/register"
              className="text-violet-400 hover:text-violet-300 hover:underline font-semibold"
            >
              Đăng ký tài khoản ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
