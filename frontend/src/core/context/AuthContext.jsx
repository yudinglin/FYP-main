import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "../api/client";

export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prevent "auto login" on a fresh visit.
    // Only restore auth from sessionStorage (tab/session scoped).
    // Also clear any legacy localStorage token/user from older deployments.
    try {
      localStorage.removeItem("ya_token");
      localStorage.removeItem("ya_user");
    } catch {}

    const savedToken = sessionStorage.getItem("ya_token");
    const savedUser = sessionStorage.getItem("ya_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login failed");

      setUser(data.user);
      setToken(data.token);

      // Store in sessionStorage so it won't auto-login next time the user visits.
      sessionStorage.setItem("ya_token", data.token);
      sessionStorage.setItem("ya_user", JSON.stringify(data.user));

      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);

    try {
      localStorage.removeItem("ya_token");
      localStorage.removeItem("ya_user");
    } catch {}

    sessionStorage.removeItem("ya_token");
    sessionStorage.removeItem("ya_user");
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
