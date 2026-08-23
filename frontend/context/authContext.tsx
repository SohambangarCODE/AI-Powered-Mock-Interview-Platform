"use client";

import { clearAuth, getStoredUser, setStoredUser, setToken } from "@/lib/auth";
import { getToken } from "@/lib/auth";
import { createContext, useCallback, useEffect, useState } from "react";
import axios from "axios";
import router from "next/dist/shared/lib/router/router";
import { useRouter } from "next/navigation";

interface authContextType {
  user:{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean; 
  refreshUser: () => void;
}

const AuthContext = createContext<authContextType|null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<authContextType["user"]>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [token, setTokenState] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(storedUser);
    }

    setIsLoggedIn(false);

},[]);


const login = useCallback(async (email: string, password: string) => {
    setIsLoggedIn(true);
    try{
        const {data} = await axios.post("/api/auth/login", { email, password });
        const { token, user } = data;
        setTokenState(token);
        setToken(token);
        setUser(user);
        setStoredUser(user);
        setIsLoggedIn(true);
        router.push("/dashboard");
    }
    catch(error){
        console.error("Login failed:", error);
        setIsLoggedIn(false);
    }
    finally{
        setIsLoggedIn(false);
    }
}, [router]);

const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoggedIn(true);
    try{
        const {data} = await axios.post("/api/auth/register", { name, email, password });
        const { token, user } = data;
        setTokenState(token);
        setToken(token);
        setUser(user);
        setStoredUser(user);
        setIsLoggedIn(true);
        router.push("/dashboard");
    }
    catch(error){
        console.error("Registration failed:", error);
        setIsLoggedIn(false);
    }
    finally{
        setIsLoggedIn(false);
    }
}, [router]);

    const logout = useCallback(() => {
        setTokenState(null);
        setUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        clearAuth();
        router.push("/login");
    }, [router]);

    const refreshUser = useCallback(async () => {
        if(!token) return;
        try {
            const { data } = await axios.get("/api/auth/me");
            setUser(data.user);
            setStoredUser(data.user);
        } catch (error) {
            console.error("Failed to refresh user:", error);
            logout();
        }
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoggedIn, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

module.exports = { AuthContext, AuthProvider };
