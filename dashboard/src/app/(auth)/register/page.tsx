"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ShoppingBag, UserCheck } from "lucide-react";
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
import apiClient from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2, "Họ và tên ít nhất 2 ký tự"),
  phone: z
    .string()
    .min(10, "Số điện thoại không hợp lệ")
    .max(15, "Số điện thoại không hợp lệ")
    .regex(/^[0-9]+$/, "Chỉ chứa các chữ số"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
  address: z.string().optional(),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      address: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setLoading(true);
    try {
      await apiClient.post("/customers/register", {
        name: values.name,
        phone: values.phone,
        email: values.email ? values.email : null,
        password: values.password,
        address: values.address ? values.address : null,
      });

      toast.success("Đăng ký tài khoản khách hàng thành công!");
      router.push("/login");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Đăng ký không thành công. Vui lòng thử lại.");
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
          <h1 className="text-2xl font-bold text-white">Đăng Ký Khách Hàng</h1>
          <p className="text-slate-400 text-sm mt-1">
            Tạo tài khoản để theo dõi đơn hàng và ưu đãi VIP
          </p>
        </div>

        {}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Họ và tên</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nguyễn Văn A"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-500"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Số điện thoại *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0901234567"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Email (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="khach@gmail.com"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-500"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Mật khẩu *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Ít nhất 6 ký tự"
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Địa chỉ giao hàng</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Số nhà, tên đường, quận/huyện, TP..."
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
                    Đang tạo tài khoản...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Đăng ký tài khoản khách hàng
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-violet-400 hover:underline font-medium">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
