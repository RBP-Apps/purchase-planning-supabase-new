import React, { createContext, useContext, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";


interface User {
  id: number;
  username: string;
  role: "admin" | "user";
  page_access: string[];
}




interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>; // <- async
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

const login = async (username: string, password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("Login")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) return false;

    const userData = {
      id: data.id,
      username: data.username,
      role: data.role === "admin" ? "admin" : "user",
      page_access: Array.isArray(data.page_access) ? data.page_access : [],
    };

    setUser(userData as any);
    localStorage.setItem("user", JSON.stringify(userData));

    return true;
  } catch (err) {
    return false;
  }
};

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
