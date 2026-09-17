import Cookies from "js-cookie";
import type { Staff, LoginRequest, AuthResponse } from "@/types";
import apiClient from "./api";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_info";
const STAFF_KEY = "staff_info";
const ROLE_KEY = "user_role";
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

    if (data.accessToken) {
      Cookies.set(TOKEN_KEY, data.accessToken, { expires: TOKEN_EXPIRES_DAYS });
    }

    const user = data.user || data.customer || data.staff;
    if (user) {
      const role = data.role || user.role || "customer";
      user.role = role;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(STAFF_KEY, JSON.stringify(user));
      Cookies.set(ROLE_KEY, role, { expires: TOKEN_EXPIRES_DAYS });
      Cookies.set(USER_KEY, JSON.stringify(user), { expires: TOKEN_EXPIRES_DAYS });
    }

    return data;
  },

  logout() {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(ROLE_KEY);
    Cookies.remove(USER_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STAFF_KEY);
    window.location.href = "/login";
  },

  getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  },

  getCurrentUser(): UnifiedUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(STAFF_KEY);
      if (raw) return JSON.parse(raw) as UnifiedUser;
    } catch {}
    try {
      const rawCookie = Cookies.get(USER_KEY);
      if (rawCookie) return JSON.parse(rawCookie) as UnifiedUser;
    } catch {}
    return null;
  },

  getRole(): "admin" | "staff" | "customer" {
    if (typeof window === "undefined") return "customer";
    const user = this.getCurrentUser();
    if (user?.role) return user.role as "admin" | "staff" | "customer";
    const cookieRole = Cookies.get(ROLE_KEY);
    if (cookieRole) return cookieRole as "admin" | "staff" | "customer";
    return "customer";
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
    return this.getRole() === "admin";
  },

  isCustomer(): boolean {
    return this.getRole() === "customer";
  },
};
