"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, type UnifiedUser } from "@/lib/auth";

export type UserRole = "admin" | "staff" | "customer";

interface RoleContextType {
  role: UserRole;
  user: UnifiedUser | null;
  setUser: (user: UnifiedUser | null) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: "customer",
  user: null,
  setUser: () => {},
});

export function RoleProvider({
  children,
  initialRole = "customer",
  initialUser = null,
}: {
  children: React.ReactNode;
  initialRole?: UserRole;
  initialUser?: UnifiedUser | null;
}) {
  const [user, setUser] = useState<UnifiedUser | null>(initialUser);
  const [role, setRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    const clientUser = authService.getCurrentUser();
    if (clientUser) {
      setUser(clientUser);
      setRole((clientUser.role as UserRole) || authService.getRole());
    } else {
      const clientRole = authService.getRole();
      setRole(clientRole);
    }
  }, []);

  return (
    <RoleContext.Provider value={{ role, user, setUser }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(RoleContext);
}

