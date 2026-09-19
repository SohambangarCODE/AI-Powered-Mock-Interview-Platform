"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import {
    clearAuth,
    getStoredUser,
    getToken,
    setStoredUser,
    setToken,
    StoredUser,
} from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
    user: StoredUser | null;
    token: string | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const [user, setUser] = useState<StoredUser | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // true on first load

    // Hydrate from localStorage on mount
    useEffect(() => {
        const storedToken = getToken();
        const storedUser = getStoredUser();

        if (storedToken && storedUser) {
            setTokenState(storedToken);
            setUser(storedUser);
        }

        setIsLoading(false);
    }, []);

    // ── Login ──────────────────────────────────────────────────────────────────
    const login = useCallback(
        async (email: string, password: string) => {
            setIsLoading(true);
            try {
                const { data } = await axiosInstance.post("/api/auth/login", {
                    email,
                    password,
                });

                setToken(data.token);
                setStoredUser(data.user);
                setTokenState(data.token);
                setUser(data.user);

                router.push("/dashboard");
            } finally {
                setIsLoading(false);
            }
        },
        [router],
    );

    // ── Register ───────────────────────────────────────────────────────────────
    const register = useCallback(
        async (name: string, email: string, password: string) => {
            setIsLoading(true);
            try {
                const { data } = await axiosInstance.post("/api/auth/register", {
                    name,
                    email,
                    password,
                });

                // Registration no longer auto-logs in — redirect to verify email
                // Store email for the verify-email page to use for resend
                if (typeof window !== "undefined") {
                    sessionStorage.setItem("pendingVerificationEmail", data.user.email);
                }

                router.push("/verify-email");
            } finally {
                setIsLoading(false);
            }
        },
        [router],
    );

    // ── Logout ─────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            // Tell backend to revoke the session (fire and forget if it fails)
            await axiosInstance.post("/api/auth/logout");
        } catch {
            // Ignore — we still clear local state
        } finally {
            clearAuth();
            setTokenState(null);
            setUser(null);
            router.push("/");
        }
    }, [router]);

    // ── Refresh user from API ──────────────────────────────────────────────────
    const refreshUser = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get("/api/auth/me");
            setStoredUser(data.user);
            setUser(data.user);
        } catch {
            // Token invalid — log out
            await logout();
        }
    }, [logout]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            isLoading,
            isLoggedIn: !!token && !!user,
            login,
            register,
            logout,
            refreshUser,
        }),
        [user, token, isLoading, login, register, logout, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Raw context export (used by useAuth hook) ─────────────────────────────────
export { AuthContext };