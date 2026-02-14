import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../core/hooks/useAuth.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const loginuser = await login(email, password);

      if (!loginuser || !loginuser.role) {
        throw new Error("Login failed");
      }

      const role = loginuser.role;

      if (role === "creator") {
        navigate("/dashboard");
      } else if (role === "business") {
        navigate("/dashboard/business");
      } else if (role === "admin") {
        navigate("/dashboard/admin");
      } else {
        navigate("*");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sign in to access your YouTube network analytics dashboard.
      </p>

      {error && (
        <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
        <div>
          <label className="text-xs text-slate-600">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Password</label>
          <input
            type="password"
            required
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-[11px] text-slate-500">
        Don’t have an account?{" "}
        <Link to="/plan" className="text-red-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
