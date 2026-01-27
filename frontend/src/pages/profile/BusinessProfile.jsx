// src/pages/profile/BusinessProfile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";

export default function BusinessProfile() {
  const { user, token, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [industry, setIndustry] = useState("");
  const [youtubeChannels, setYoutubeChannels] = useState([""]); // Changed to array for multiple channels
  const [channelNames, setChannelNames] = useState([""]); // For channel names/titles

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const MAX_CHANNELS = 5;

  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);

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

  useEffect(() => {
    if (activeSection === "subscription" && token) {
      fetchSubscriptionInfo();
      fetchAvailablePlans();
    }
  }, [activeSection, token]);

  async function fetchSubscriptionInfo() {
    if (!token) return;
    
    setLoadingSubscription(true);
    try {
      const resp = await fetch("http://localhost:5000/api/profile/subscription", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json();
      if (resp.ok) {
        setSubscription(data.subscription);
        setPlan(data.plan);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    } finally {
      setLoadingSubscription(false);
    }
  }

  async function fetchAvailablePlans() {
    try {
      const resp = await fetch("http://localhost:5000/api/pricing");
      const data = await resp.json();
      if (resp.ok) {
        setAvailablePlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  }

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
      const validChannels = youtubeChannels
        .map((url, index) => ({
          url: url.trim(),
          name: channelNames[index]?.trim() || `Channel ${index + 1}`,
          is_primary: index === 0, // ✅ PRIMARY FLAG
        }))
        .filter(channel => channel.url !== "");

      const resp = await fetch(
        "http://localhost:5000/api/profile/youtube-channels",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ channels: validChannels }),
        }
      );

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to update channels");

      setUser(data.user);
      setSuccess("YouTube channels saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Function to add a new channel input
  const addChannel = () => {
    if (youtubeChannels.length >= MAX_CHANNELS) return;
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

          {activeSection === "subscription" && (
            <SubscriptionSection
              user={user}
              subscription={subscription}
              plan={plan}
              payments={payments}
              availablePlans={availablePlans}
              loading={loadingSubscription}
              token={token}
              onUpdate={fetchSubscriptionInfo}
              onCancel={() => {
                logout();
                navigate("/");
              }}
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
    { label: "Subscription", value: "subscription" },
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
  const MAX_CHANNELS = 5;
  
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">
        Link YouTube channels 
      </h1>

      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-6">
        <p className="text-sm text-slate-600">
          Add multiple YouTube channels by clicking the + button. Enter channel IDs and optional names.
        </p>

        {youtubeChannels.map((url, index) => (
          <div key={index} className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium flex items-center gap-2">
                  <span className="text-slate-700">
                    Channel {index + 1}
                  </span>

                  {index === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold">
                      Primary
                    </span>
                  )}
                </h3>
                {index === 0 && (
                <p className="text-xs text-slate-400">
                  This channel will be used as your primary channel across the platform.
                </p>
              )}
              {youtubeChannels.length > 1 && index !== 0 && (
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
            disabled={youtubeChannels.length >= MAX_CHANNELS}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed transition-colors
              ${
                youtubeChannels.length >= MAX_CHANNELS
                  ? "border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50"
                  : "border-slate-300 hover:border-sky-400 hover:bg-sky-50 text-slate-500 hover:text-sky-600"
              }`}
        >

          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">Add Another Channel</span>
        </button>

        {youtubeChannels.length >= MAX_CHANNELS && (
        <p className="text-xs text-red-500 mt-2">
           You can link up to 3 YouTube channels only.
        </p>
         )}

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

/* ================= Subscription Section ================= */

function SubscriptionSection({
  user,
  subscription,
  plan,
  payments,
  availablePlans,
  loading,
  token,
  onUpdate,
  onCancel,
}) {
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Filter available plans - show both creator and business plans for switching
  // Both creator and business users can switch to either plan
  const filteredPlans = availablePlans.filter((p) => {
    // Show plans that match the user's role OR are available to both
    if (user?.role === "creator") {
      return p.target_role === "creator" || p.target_role === "BOTH";
    } else if (user?.role === "business") {
      return p.target_role === "business" || p.target_role === "BOTH";
    }
    return true;
  });

  // Get all alternative plans (excluding current plan)
  const alternativePlans = filteredPlans.filter(
    (p) => p.plan_id !== plan?.plan_id
  );

  async function handleUpdatePlan(planName) {
    if (!token || !planName) {
      setError("Please select a plan");
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch("http://localhost:5000/api/profile/subscription", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_name: planName,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to update subscription");

      setSuccess("Subscription updated successfully! Check your email for confirmation.");
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancelSubscription() {
    if (!token) return;

    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch("http://localhost:5000/api/profile/subscription", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to cancel subscription");

      // Subscription cancelled - log out user and redirect
      setShowCancelConfirm(false);
      // Small delay to show success message, then logout
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (err) {
      setError(err.message);
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-semibold text-slate-900 mb-4">
          Subscription Management
        </h1>
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-600">Loading subscription information...</p>
        </section>
      </>
    );
  }

  if (!subscription) {
    return (
      <>
        <h1 className="text-xl font-semibold text-slate-900 mb-4">
          Subscription Management
        </h1>
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-600">No active subscription found.</p>
        </section>
      </>
    );
  }

  const isCancelled = subscription.status === "CANCELLED";

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">
        Subscription Management
      </h1>

      {/* Current Subscription */}
      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Current Subscription</h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isCancelled
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {subscription.status}
          </span>
        </div>

        {plan && (
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Plan Name:</span>
              <span className="text-sm font-semibold text-slate-900">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Monthly Price:</span>
              <span className="text-sm font-semibold text-slate-900">
                ${plan.price_monthly.toFixed(2)}
              </span>
            </div>
            {/* <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Max Channels:</span>
              <span className="text-sm font-semibold text-slate-900">{plan.max_channels}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Max Saved Graphs:</span>
              <span className="text-sm font-semibold text-slate-900">{plan.max_saved_graphs}</span>
            </div> */}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Start Date:</span>
              <span className="text-sm font-semibold text-slate-900">
                {new Date(subscription.start_date).toLocaleDateString()}
              </span>
            </div>
            {subscription.end_date && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">End Date:</span>
                <span className="text-sm font-semibold text-slate-900">
                  {new Date(subscription.end_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Change Plan */}
      {!isCancelled && alternativePlans.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Change Plan</h2>
          <p className="text-sm text-slate-600">
            Switch to a different subscription plan. You can change from {plan?.name} to any of the available plans below.
          </p>

          <div className="space-y-4">
            {alternativePlans.map((altPlan) => (
              <div
                key={altPlan.plan_id}
                className="border border-slate-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{altPlan.name}</h3>
                    {altPlan.description && (
                      <p className="text-xs text-slate-500 mt-1">{altPlan.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      ${altPlan.price_monthly.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">per month</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-600">Max Channels:</span>
                    <span className="ml-2 font-semibold text-slate-900">{altPlan.max_channels}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Max Saved Graphs:</span>
                    <span className="ml-2 font-semibold text-slate-900">{altPlan.max_saved_graphs}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdatePlan(altPlan.name)}
                  disabled={updating}
                  className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {updating ? "Updating..." : `Switch to ${altPlan.name} Plan`}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cancel Subscription */}
      {!isCancelled && (
        <section className="rounded-2xl bg-white shadow-sm border border-red-200 p-6 space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-red-700">Cancel Subscription</h2>
          <p className="text-sm text-slate-600">
            Cancelling your subscription will end your access to premium features. You will be logged out.
          </p>

          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-red-700">
                Are you sure you want to cancel your subscription? You will be logged out immediately.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Yes, Cancel"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm hover:bg-slate-300 disabled:opacity-50"
                >
                  No, Keep Subscription
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.payment_id}
                className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0"
              >
                <div>
                  {/* <p className="text-sm font-semibold text-slate-900">
                    Payment #{payment.payment_id}
                  </p> */}
                  <p className="text-sm text-slate-900">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    ${Number(payment.amount).toFixed(2)} {payment.currency}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      payment.status === "SUCCESS"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <Message type="error" text={error} />}
      {success && <Message type="success" text={success} />}
    </>
  );
}