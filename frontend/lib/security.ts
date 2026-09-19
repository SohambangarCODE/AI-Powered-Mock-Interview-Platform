/**
 * Security API helpers — sessions, login history, password management.
 * All calls go through the shared axios instance (auto-attaches the token).
 */

import axiosInstance from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveSession {
    sessionId: string;
    device: string;
    browser: string;
    os: string;
    ipAddress: string;
    createdAt: string;
    lastActiveAt: string;
    expiresAt: string;
    isCurrent: boolean;
}

export interface LoginEvent {
    _id: string;
    eventType: string;
    success: boolean;
    ipAddress: string;
    device: string;
    browser: string;
    os: string;
    note: string;
    timestamp: string;
}

export interface LoginHistoryResponse {
    events: LoginEvent[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ── Session management ────────────────────────────────────────────────────────

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
    const { data } = await axiosInstance.get('/api/auth/sessions');
    return data.sessions;
};

export const revokeSession = async (sessionId: string): Promise<void> => {
    await axiosInstance.delete(`/api/auth/sessions/${sessionId}`);
};

export const revokeOtherSessions = async (): Promise<void> => {
    await axiosInstance.delete('/api/auth/sessions/others');
};

export const logoutAllSessions = async (): Promise<void> => {
    await axiosInstance.post('/api/auth/logout-all');
};

// ── Login history ─────────────────────────────────────────────────────────────

export const getLoginHistory = async (page = 1): Promise<LoginHistoryResponse> => {
    const { data } = await axiosInstance.get(`/api/auth/login-history?page=${page}`);
    return data;
};

// ── Password management ───────────────────────────────────────────────────────

export const changePassword = async (
    currentPassword: string,
    newPassword: string
): Promise<string> => {
    const { data } = await axiosInstance.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
    });
    return data.message;
};

export const forgotPassword = async (email: string): Promise<string> => {
    const { data } = await axiosInstance.post('/api/auth/forgot-password', { email });
    return data.message;
};

export const resetPassword = async (
    token: string,
    newPassword: string
): Promise<string> => {
    const { data } = await axiosInstance.post('/api/auth/reset-password', {
        token,
        newPassword,
    });
    return data.message;
};

// ── Email verification ────────────────────────────────────────────────────────

export const verifyEmail = async (token: string): Promise<string> => {
    const { data } = await axiosInstance.post('/api/auth/verify-email', { token });
    return data.message;
};

export const resendVerification = async (email: string): Promise<string> => {
    const { data } = await axiosInstance.post('/api/auth/resend-verification', { email });
    return data.message;
};
