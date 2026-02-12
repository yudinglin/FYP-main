import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read from the URL ?role=creator / ?role=business
  const roleFromUrl = searchParams.get("role"); // "creator" / "business" / null

  // We only lock in these two types of users
  const validLockedRoles = ["creator", "business"];
  const isRoleLocked = validLockedRoles.includes(roleFromUrl);

  // Initial role: If the URL has a valid role, use it; otherwise, the default is creator.
  const initialRole = isRoleLocked ? roleFromUrl : "creator";

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState(initialRole);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const resp = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role, 
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data.message || "Register failed");
      }

      navigate("/login");
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Create your account</h2>
      <p className="text-xs text-slate-500 mb-6">
        Choose your role to get a tailored analytics experience.
      </p>

      {error && (
        <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-xs text-slate-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60"
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">First Name</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60"
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Last Name</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60"
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60"
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Role</label>
          <select
            value={role}
            // If it's locked, then `onChange` won't allow changing the role.
            onChange={(e) => {
              if (!isRoleLocked) {
                setRole(e.target.value);
              }
            }}
            disabled={isRoleLocked} // Disable dropdown directly when locked
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 disabled:bg-slate-100"
          >
            <option value="creator">Content Creator</option>
            <option value="business">Business / Brand</option>
            
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-[11px] text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-red-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
