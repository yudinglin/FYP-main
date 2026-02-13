// src/pages/admin/AdminProfile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../core/context/AuthContext";

export default function AdminProfile() {
  const { user, token, setUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  async function handleSaveProfile() {
    if (!token) return setError("You are not logged in.");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to update profile");

      setUser(data.user);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">

        <h1 className="text-xl font-semibold text-slate-900 mb-4">
          Admin Profile
        </h1>

        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <ProfileAvatar
              name={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Admin"}
            />

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <ProfileField label="Email" value={user?.email} readOnly />
              <ProfileField label="Role" value={user?.role} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <ProfileField
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <ProfileField
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {error && <Message type="error" text={error} />}
          {success && <Message type="success" text={success} />}

          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ================= Reusable Components ================= */

function ProfileAvatar({ name }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-lg font-semibold text-slate-700">
        {name?.[0] || "A"}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900">{name}</p>
      </div>
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder, readOnly = false }) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        type="text"
        className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </label>
  );
}

function Message({ type, text }) {
  return (
    <p
      className={`text-xs px-3 py-2 rounded-lg border ${
        type === "error"
          ? "bg-red-50 border-red-100 text-red-600"
          : "bg-emerald-50 border-emerald-100 text-emerald-600"
      }`}
    >
      {text}
    </p>
  );
}
