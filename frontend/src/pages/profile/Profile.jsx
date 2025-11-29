// src/pages/profile/Profile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../core/context/AuthContext"; // 如果你有 hooks 文件，就改成原来的路径

export default function Profile() {
  const { user, token, setUser } = useAuth();

  const isCreator = user?.role === "CREATOR";
  const isBusiness = user?.role === "BUSINESS";
  const isAdmin = user?.role === "ADMIN";

  // Local Forms state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // When the user changes, synchronize the first_name / last_name from the backend to the form.
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  async function handleSave() {
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const resp = await fetch("http://localhost:5000/api/profile", {
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

      if (!resp.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      // Update the global user (in AuthContext)
      setUser(data.user);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        <ProfileSidebar />

        <main className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 mb-4">
            Account settings
          </h1>

          <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
            {/* Top profile picture + Email + Role*/}
            <div className="flex flex-col md:flex-row gap-6 md:items-center">
              <ProfileAvatar
                name={
                  user
                    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                      "User"
                    : "User"
                }
              />

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <ProfileField label="Email" value={user?.email} readOnly />
                <ProfileField
                  label="Role"
                  value={user?.role || "CREATOR"}
                  readOnly
                />
              </div>
            </div>

            {/*  First / Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <ProfileField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
              />
              <ProfileField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
              />
            </div>

            {/* Different roles extra profile （ UI，without backend）*/}
            {isCreator && (
              <RoleSection title="Creator profile">
                <ProfileField
                  label="Primary channel"
                  placeholder="YouTube URL"
                />
                <ProfileField
                  label="Niche / category"
                  placeholder="e.g. Gaming, Education"
                />
              </RoleSection>
            )}

            {isBusiness && (
              <RoleSection title="Business profile">
                <ProfileField
                  label="Company name"
                  placeholder="Your company"
                />
                <ProfileField
                  label="Website"
                  placeholder="https://example.com"
                />
              </RoleSection>
            )}

            {isAdmin && (
              <RoleSection title="Admin profile">
                <ProfileField
                  label="Staff number"
                  placeholder="e.g. A1234"
                />
                <ProfileField
                  label="Position"
                  placeholder="e.g. System Admin"
                />
              </RoleSection>
            )}

            {/* Error/Success Message*/}
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                {success}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProfileSidebar() {
  return (
    <aside className="w-56 shrink-0 rounded-2xl bg-white border border-slate-100 shadow-sm text-sm">
      <div className="px-4 py-4 border-b border-slate-100 font-semibold text-slate-900">
        Settings
      </div>
      <nav className="px-2 py-3 space-y-1">
        <SidebarItem label="Profile" active />
        <SidebarItem label="Password" />
        <SidebarItem label="Notifications" />
      </nav>
    </aside>
  );
}

function SidebarItem({ label, active = false }) {
  return (
    <button
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition ${
        active
          ? "bg-sky-50 text-sky-700 font-semibold"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-sky-500" : "bg-slate-300"
        }`}
      />
      {label}
    </button>
  );
}

function ProfileAvatar({ name }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-lg font-semibold text-slate-700">
        {name?.[0] || "U"}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">
          Upload new
        </button>
        <button className="ml-3 text-xs text-slate-400 hover:text-slate-600">
          Remove avatar
        </button>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        type="text"
        className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
        value={value ?? ""} // Controlled components
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </label>
  );
}

function RoleSection({ title, children }) {
  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
