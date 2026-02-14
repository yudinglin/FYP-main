// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "../api/client";

// Context
export const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const savedToken = localStorage.getItem("ya_token");
    const savedUser = localStorage.getItem("ya_user");

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

    const resp = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      setLoading(false);
      throw new Error(data.message || "Login failed");
    }


    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("ya_token", data.token);
    localStorage.setItem("ya_user", JSON.stringify(data.user));

    setLoading(false);
    return data.user;
  }


  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("ya_token");
    localStorage.removeItem("ya_user");
  }


  const value = {
    user,
    token,
    loading,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

