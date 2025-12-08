// src/pages/profile/Profile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../core/context/AuthContext";

export default function BusinessProfile() {
  const { user, token, setUser } = useAuth();

  const [activeSection, setActiveSection] = useState("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [industry, setIndustry] = useState("");
  const [youtubeChannels, setYoutubeChannels] = useState([""]); // Changed to array for multiple channels
  const [channelNames, setChannelNames] = useState([""]); // For channel names/titles

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const industryOptions = [
    "Select your industry",
    "Education",
    "Gaming",
    "Technology",
    "Entertainment",
    "Health & Fitness",
    "Business",
    "Music",
    "Travel",
    "Food & Cooking",
    "Other"
  ];

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setIndustry(user.industry || "");
      
      // Initialize channels from user data
      if (user.youtube_channels && user.youtube_channels.length > 0) {
        setYoutubeChannels(user.youtube_channels.map(ch => ch.url || ""));
        setChannelNames(user.youtube_channels.map(ch => ch.name || ""));
      } else {
        // If no channels in user data, initialize with empty array
        setYoutubeChannels([""]);
        setChannelNames([""]);
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
          industry: industry,
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

  async function handleSaveChannels() {
    if (!token) return setError("You are not logged in.");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Filter out empty channels
      const validChannels = youtubeChannels
        .map((url, index) => ({
          url: url.trim(),
          name: channelNames[index]?.trim() || `Channel ${index + 1}`
        }))
        .filter(channel => channel.url !== "");

      const resp = await fetch("http://localhost:5000/api/profile/youtube-channels", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channels: validChannels }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to update channels");

      setUser(data.user);
      setSuccess(`${validChannels.length} YouTube channel(s) saved successfully!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Function to add a new channel input
  const addChannel = () => {
    setYoutubeChannels([...youtubeChannels, ""]);
    setChannelNames([...channelNames, ""]);
  };

  // Function to remove a channel input
  const removeChannel = (index) => {
    if (youtubeChannels.length <= 1) {
      // Don't remove the last one, just clear it
      const newChannels = [...youtubeChannels];
      const newNames = [...channelNames];
      newChannels[index] = "";
      newNames[index] = "";
      setYoutubeChannels(newChannels);
      setChannelNames(newNames);
    } else {
      const newChannels = youtubeChannels.filter((_, i) => i !== index);
      const newNames = channelNames.filter((_, i) => i !== index);
      setYoutubeChannels(newChannels);
      setChannelNames(newNames);
    }
  };

  // Function to update a specific channel URL
  const updateChannelUrl = (index, value) => {
    const newChannels = [...youtubeChannels];
    newChannels[index] = value;
    setYoutubeChannels(newChannels);
  };

  // Function to update a specific channel name
  const updateChannelName = (index, value) => {
    const newNames = [...channelNames];
    newNames[index] = value;
    setChannelNames(newNames);
  };

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
              industry={industry}
              setFirstName={setFirstName}
              setLastName={setLastName}
              setIndustry={setIndustry}
              industryOptions={industryOptions}
              error={error}
              success={success}
              saving={saving}
              onSave={handleSaveProfile}
            />
          )}

          {activeSection === "linkChannel" && (
            <LinkChannelSection
              youtubeChannels={youtubeChannels}
              channelNames={channelNames}
              updateChannelUrl={updateChannelUrl}
              updateChannelName={updateChannelName}
              addChannel={addChannel}
              removeChannel={removeChannel}
              error={error}
              success={success}
              saving={saving}
              onSave={handleSaveChannels}
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
  industry,
  setFirstName,
  setLastName,
  setIndustry,
  industryOptions,
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

        {/* Industry Dropdown Section - Added below first name */}
        <div className="text-sm">
          <label className="block text-xs mb-1">
            <span className="text-slate-500">Specify your industry</span>
            <select
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {industryOptions.map((option, index) => (
                <option key={index} value={index === 0 ? "" : option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              This helps us customize your experience
            </p>
          </label>
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
  youtubeChannels,
  channelNames,
  updateChannelUrl,
  updateChannelName,
  addChannel,
  removeChannel,
  error,
  success,
  saving,
  onSave,
}) {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">
        Link your YouTube channels
      </h1>

      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
        <p className="text-sm text-slate-600">
          Add multiple YouTube channels by clicking the + button. Enter channel IDs and optional names.
        </p>

        {youtubeChannels.map((url, index) => (
          <div key={index} className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-700">
                Channel {index + 1}
              </h3>
              {youtubeChannels.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChannel(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Channel Name (Optional)
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  placeholder="e.g., My Gaming Channel"
                  value={channelNames[index] || ""}
                  onChange={(e) => updateChannelName(index, e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  YouTube ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    value={url}
                    onChange={(e) => updateChannelUrl(index, e.target.value)}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Example ID format:{" "}
              <span className="text-sky-600">
                UCxYpJqNzKfLmWvB8T9zRwS2g
              </span>
            </p>
          </div>
        ))}

        {/* Add Channel Button */}
        <button
          type="button"
          onClick={addChannel}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 hover:bg-sky-50 text-slate-500 hover:text-sky-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">Add Another Channel</span>
        </button>

        {error && <Message type="error" text={error} />}
        {success && <Message type="success" text={success} />}

        <div className="flex justify-end pt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700"
          >
            {saving ? "Saving..." : "Save All Channels"}
          </button>
        </div>
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