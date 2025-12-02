// src/pages/profile/Profile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../core/context/AuthContext";

export default function Profile() {
  const { user, token, setUser } = useAuth();

  // Track active section
  const [activeSection, setActiveSection] = useState("profile");

  // Local profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Saving and feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isCreator = user?.role === "CREATOR";
  const isBusiness = user?.role === "BUSINESS";
  const isAdmin = user?.role === "ADMIN";

  // Initialize profile and YouTube channel
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setYoutubeUrl(user.youtube_channel || "");
    }
  }, [user]);

  // Save profile (first/last name)
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
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  // Save YouTube channel
  async function handleSaveChannel() {
    if (!token) return setError("You are not logged in.");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch("http://localhost:5000/api/profile/youtube", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ youtube_channel: youtubeUrl }),
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
        <ProfileSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <main className="flex-1">
          {activeSection === "profile" && (
            <ProfileSection
              user={user}
              firstName={firstName}
              lastName={lastName}
              setFirstName={setFirstName}
              setLastName={setLastName}
              isCreator={isCreator}
              isBusiness={isBusiness}
              isAdmin={isAdmin}
              error={error}
              success={success}
              saving={saving}
              onSave={handleSaveProfile}
            />
          )}

          {activeSection === "password" && <PasswordSection />}
          {activeSection === "notifications" && <NotificationsSection />}
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
    { label: "Password", value: "password" },
    { label: "Notifications", value: "notifications" },
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
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-sky-500" : "bg-slate-300"}`}
      />
      {label}
    </button>
  );
}

/* ================= Sections ================= */
function ProfileSection({
  user,
  firstName,
  lastName,
  setFirstName,
  setLastName,
  isCreator,
  isBusiness,
  isAdmin,
  error,
  success,
  saving,
  onSave,
}) {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Account settings</h1>
      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <ProfileAvatar name={user ? `${user.first_name} ${user.last_name}`.trim() || "User" : "User"} />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <ProfileField label="Email" value={user?.email} readOnly />
            <ProfileField label="Role" value={user?.role || "CREATOR"} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <ProfileField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your first name" />
          <ProfileField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Your last name" />
        </div>

        {isCreator && (
          <RoleSection title="Creator profile">
            <ProfileField label="Primary channel" placeholder="YouTube URL" />
            <ProfileField label="Niche / category" placeholder="e.g. Gaming, Education" />
          </RoleSection>
        )}
        {isBusiness && (
          <RoleSection title="Business profile">
            <ProfileField label="Company name" placeholder="Your company" />
            <ProfileField label="Website" placeholder="https://example.com" />
          </RoleSection>
        )}
        {isAdmin && (
          <RoleSection title="Admin profile">
            <ProfileField label="Staff number" placeholder="e.g. A1234" />
            <ProfileField label="Position" placeholder="e.g. System Admin" />
          </RoleSection>
        )}

        {error && <Message type="error" text={error} />}
        {success && <Message type="success" text={success} />}

        <div className="flex justify-end">
          <button onClick={onSave} disabled={saving} className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </section>
    </>
  );
}

function PasswordSection() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Change password</h1>
      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="space-y-4">
          <ProfileField label="Current password" placeholder="Enter current password" type="password" />
          <ProfileField label="New password" placeholder="Enter new password" type="password" />
          <ProfileField label="Confirm new password" placeholder="Confirm new password" type="password" />
        </div>
        <div className="flex justify-end">
          <button className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700">
            Update password
          </button>
        </div>
      </section>
    </>
  );
}

function NotificationsSection() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Notification preferences</h1>
      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
        <NotificationToggle label="Email notifications" description="Receive email updates about your account activity" />
        <NotificationToggle label="Marketing emails" description="Receive news, updates, and promotional content" />
        <NotificationToggle label="New collaboration requests" description="Get notified when brands want to work with you" />
        <NotificationToggle label="Campaign updates" description="Receive updates about your active campaigns" />
        <div className="flex justify-end">
          <button className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700">
            Save preferences
          </button>
        </div>
      </section>
    </>
  );
}

function LinkChannelSection({ youtubeUrl, setYoutubeUrl, error, success, saving, onSave }) {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Link your YouTube channel</h1>
      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-5">
        <div className="text-sm text-slate-600">
          Paste your YouTube channel link below. Example: <span className="text-sky-600">https://www.youtube.com/@yourchannel</span>
        </div>

        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50"
          placeholder="https://www.youtube.com/@yourchannel"
        />

        {error && <Message type="error" text={error} />}
        {success && <Message type="success" text={success} />}

        <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700 disabled:opacity-60">
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
        <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">Upload new</button>
        <button className="ml-3 text-xs text-slate-400 hover:text-slate-600">Remove avatar</button>
      </div>
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder, readOnly = false, type = "text" }) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        type={type}
        className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
        value={value ?? ""}
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
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function NotificationToggle({ label, description }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-sky-600" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"} translate-y-0.5`} />
      </button>
    </div>
  );
}

function Message({ type, text }) {
  return (
    <p className={`text-xs ${type === "error" ? "text-red-600 bg-red-50 border border-red-100" : "text-emerald-600 bg-emerald-50 border border-emerald-100"} px-3 py-2 rounded-lg`}>
      {text}
    </p>
  );
}
