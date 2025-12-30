import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";

export default function ContactSupport() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  /* -------------------- STATE -------------------- */

  const [view, setView] = useState("new"); // "new" | "responses"
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const [status, setStatus] = useState({ type: null, message: "" });
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
  });

  /* -------------------- EFFECTS -------------------- */

  // Redirect admins away
  useEffect(() => {
    if (user?.role?.toLowerCase() === "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  // Prefill name & email
  useEffect(() => {
    const defaultName = user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : "";

    setForm((prev) => ({
      ...prev,
      name: prev.name || defaultName,
      email: prev.email || user?.email || "",
    }));
  }, [user]);

  // Fetch user's support tickets + responses
  useEffect(() => {
    if (view !== "responses") return;

    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        const resp = await fetch(
          "http://localhost:5000/api/support/my-tickets",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.message || "Failed to load tickets");
        }

        setTickets(data.tickets || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [view, token]);

  /* -------------------- HANDLERS -------------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });
    setSubmitting(true);

    const payload = {
      name: form.name?.trim(),
      email: form.email?.trim(),
      category: form.category,
      subject: form.subject,
      message: form.message,
    };

    try {
      const resp = await fetch("http://localhost:5000/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || "Unable to submit support request");
      }

      setStatus({
        type: "success",
        message: data.message || "Your request has been submitted.",
      });

      setForm((prev) => ({
        ...prev,
        category: "",
        subject: "",
        message: "",
      }));
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 flex items-start justify-center p-6">
      {/* Sidebar */}
      <aside className="w-60 mr-6 flex-shrink-0 bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="p-4 font-semibold text-gray-800 border-b border-gray-200">
          Support
        </div>
        <nav className="flex flex-col p-2 space-y-2 text-sm">
          <button
            onClick={() => setView("new")}
            className={`px-4 py-2 rounded-lg w-full text-left ${
              view === "new"
                ? "bg-red-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            New Request
          </button>
          <button
            onClick={() => setView("responses")}
            className={`px-4 py-2 rounded-lg w-full text-left ${
              view === "responses"
                ? "bg-red-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            View Responses
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 max-w-xl w-full">
        {/* ---------------- NEW REQUEST ---------------- */}
        {view === "new" && (
          <div className="bg-white shadow-lg rounded-2xl p-10 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Contact Support</h1>
            <p className="text-gray-600">
              Have a question or issue? Fill out the form below and our support
              team will get back to you as soon as possible.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col">
                  <span className="text-gray-700 font-medium">Name</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md"
                    required
                    disabled={!!user}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-gray-700 font-medium">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md"
                    required
                    disabled={!!user}
                  />
                </label>
              </div>

              <label className="flex flex-col">
                <span className="text-gray-700 font-medium">Category</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="feedback">Feedback / Suggestions</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-gray-700 font-medium">Subject</span>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                  required
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-700 font-medium">Message</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={6}
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                  required
                />
              </label>

              {status.message && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    status.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>
        )}

        {/* ---------------- RESPONSES ---------------- */}
        {view === "responses" && (
          <div className="bg-white shadow-lg rounded-2xl p-8 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Your Support Responses
            </h1>
            <p className="text-gray-600">
              View the replies from our support team for your previous requests.
            </p>

            {loadingTickets && (
              <p className="text-gray-500">Loading tickets...</p>
            )}

            {!loadingTickets && tickets.length === 0 && (
              <p className="text-gray-500">No support tickets found.</p>
            )}

            {tickets.map((ticket) => (
              <div
                key={ticket.ticket_id}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {ticket.subject}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {ticket.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Status: {ticket.status}
                  </p>
                </div>

                {ticket.responses?.length > 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Support Replies
                    </p>
                    {ticket.responses.map((r) => (
                      <p
                        key={r.response_id}
                        className="text-sm text-gray-700"
                      >
                        {r.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No response yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
