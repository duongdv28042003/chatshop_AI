import Cookies from "js-cookie";
import type { Staff, LoginRequest, AuthResponse } from "@/types";
import apiClient from "./api";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_info";
const STAFF_KEY = "staff_info";
const TOKEN_EXPIRES_DAYS = 7;

export interface UnifiedUser {
  id: string;
  fullName?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  role: string;
  tier?: string;
}

export const authService = {
  async login(credentials: LoginRequest & { identifier?: string }): Promise<AuthResponse> {
    const payload = {
      identifier: credentials.identifier || credentials.email,
      password: credentials.password,
    };
    const { data } = await apiClient.post<any>("/auth/login", payload);

    Cookies.set(TOKEN_KEY, data.accessToken, { expires: TOKEN_EXPIRES_DAYS });
    const user = data.user || data.staff;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(STAFF_KEY, JSON.stringify(user));

    return data;
  },

  logout() {
    Cookies.remove(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STAFF_KEY);
    window.location.href = "/login";
  },

  getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  },

  getCurrentUser(): UnifiedUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(STAFF_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UnifiedUser;
    } catch {
      return null;
    }
  },

  getCurrentStaff(): Staff | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || "",
      fullName: user.fullName || user.name || "Người dùng",
      role: user.role as any,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  },

  isAuthenticated(): boolean {
    return !!Cookies.get(TOKEN_KEY);
  },

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === "admin";
  },

  isCustomer(): boolean {
    return this.getCurrentUser()?.role === "customer";
  },
};
