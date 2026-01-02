// src/pages/profile/Profile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../core/context/AuthContext";

export default function Profile() {
  const { user, token, setUser } = useAuth();

  const [activeSection, setActiveSection] = useState("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      if (user.youtube_channels?.length > 0) {
        setYoutubeUrl(user.youtube_channels[0].url || "");
      } else {
        setYoutubeUrl("");
      }

    }
  }, [user]);

  async function handleSaveProfile() {
    if (!token) return setError("You are not logged in.");

    setSaving(true);
    setError("");
    setSuccess("");

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
      if (!resp.ok) throw new Error(data.message || "Failed to update profile");

      setUser(data.user);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChannel() {
    if (!token) return setError("You are not logged in.");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch("http://localhost:5000/api/profile/youtube-channels", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
        channels: youtubeUrl
          ? [{ url: youtubeUrl, name: "Primary Channel" }]
          : []
      }),

      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to update");

      setUser(data.user);
      setSuccess("YouTube channel linked successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        <ProfileSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <main className="flex-1">
          {activeSection === "profile" && (
            <ProfileSection
              user={user}
              firstName={firstName}
              lastName={lastName}
              setFirstName={setFirstName}
              setLastName={setLastName}
              error={error}
              success={success}
              saving={saving}
              onSave={handleSaveProfile}
            />
          )}

          {activeSection === "linkChannel" && (
            <LinkChannelSection
              youtubeUrl={youtubeUrl}
              setYoutubeUrl={setYoutubeUrl}
              error={error}
              success={success}
              saving={saving}
              onSave={handleSaveChannel}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ================= Sidebar ================= */

function ProfileSidebar({ activeSection, onSectionChange }) {
  const items = [
    { label: "Profile", value: "profile" },
    { label: "Link Channel", value: "linkChannel" },
  ];

  return (
    <aside className="w-56 shrink-0 rounded-2xl bg-white border border-slate-100 shadow-sm text-sm">
      <div className="px-4 py-4 border-b border-slate-100 font-semibold text-slate-900">
        Settings
      </div>
      <nav className="px-2 py-3 space-y-1">
        {items.map((item) => (
          <SidebarItem
            key={item.value}
            label={item.label}
            active={activeSection === item.value}
            onClick={() => onSectionChange(item.value)}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
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

/* ================= Profile Section ================= */

function ProfileSection({
  user,
  firstName,
  lastName,
  setFirstName,
  setLastName,
  error,
  success,
  saving,
  onSave,
}) {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">
        Account settings
      </h1>

      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
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
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </section>
    </>
  );
}

/* ================= Link Channel Section ================= */

function LinkChannelSection({
  youtubeUrl,
  setYoutubeUrl,
  error,
  success,
  saving,
  onSave,
}) {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">
        Link your YouTube channel
      </h1>

      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-4">
        <p className="text-sm text-slate-600">
          Paste your YouTube channel ID. Example:{" "}
          <span className="text-sky-600">
            UCxYpJqNzKfLmWvB8T9zRwS2g
          </span>
        </p>

        <input
          type="text"
          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />

        {error && <Message type="error" text={error} />}
        {success && <Message type="success" text={success} />}

        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700"
        >
          {saving ? "Saving..." : "Save Channel"}
        </button>
      </section>
    </>
  );
}

/* ================= Reusable Components ================= */

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