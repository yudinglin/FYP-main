import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";
import { getSupportTickets, respondToSupportTicket } from "../../core/api/user.js";

export default function AdminSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  if (user.role?.toLowerCase() !== "admin") {
    navigate("/");
    return null;
  }

  const [view, setView] = useState("pending"); // "pending" or "resolved"
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const tickets = await getSupportTickets();
      setRequests(tickets);
      setError(null);
    } catch (err) {
      setError("Failed to load support tickets");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyChange = (id, value) => {
    setReplyText({ ...replyText, [id]: value });
  };

  const handleReplySubmit = async (id) => {
    const message = replyText[id]?.trim();
    if (!message) return;

    try {
      setSubmittingReply({ ...submittingReply, [id]: true });
      const res = await respondToSupportTicket(id, message);
      if (res.ok) {
        // Show success message
        setSuccessMessage(`Response sent successfully! Email notification has been sent to the user.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        
        // Refresh tickets to get updated data
        await fetchTickets();
        setReplyText({ ...replyText, [id]: "" });
      } else {
        alert("Failed to submit response: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error submitting response");
      console.error(err);
    } finally {
      setSubmittingReply({ ...submittingReply, [id]: false });
    }
  };

  const filteredRequests = requests.filter(
    (r) => {
      if (view === "pending") return r.status === "OPEN";
      if (view === "resolved") return r.status === "ANSWERED" || r.status === "CLOSED";
      return true;
    }
  );

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 flex p-6">
      {/* Sidebar */}
      <aside className="w-64 mr-6 flex-shrink-0 bg-white rounded-2xl shadow border border-gray-200">
        <div className="p-4 font-semibold text-gray-800 border-b border-gray-200">
          Admin Support
        </div>
        <nav className="flex flex-col p-2 space-y-2 text-sm">
          <button
            onClick={() => setView("pending")}
            className={`px-4 py-2 rounded-lg w-full text-left ${
              view === "pending"
                ? "bg-red-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Pending Requests
          </button>
          <button
            onClick={() => setView("resolved")}
            className={`px-4 py-2 rounded-lg w-full text-left ${
              view === "resolved"
                ? "bg-red-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Resolved Requests
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-gray-800">
          {view === "pending" ? "Pending Requests" : "Resolved Requests"}
        </h1>

        {loading && <p className="text-gray-500">Loading tickets...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-700">✅ {successMessage}</p>
          </div>
        )}
        {!loading && !error && filteredRequests.length === 0 && (
          <p className="text-gray-500">No {view} requests at the moment.</p>
        )}

        {!loading && !error && filteredRequests.map((req) => (
          <div
            key={req.ticket_id}
            className="bg-white shadow rounded-2xl p-6 flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold text-gray-700">{req.subject}</p>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  req.status === "OPEN"
                    ? "bg-yellow-100 text-yellow-800"
                    : req.status === "ANSWERED"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {req.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">From: {req.email || req.name}</p>
            <p className="text-gray-600">{req.message}</p>

            {/* Display existing responses */}
            {req.responses && req.responses.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-medium text-gray-700">Responses:</p>
                {req.responses.map((response) => (
                  <div key={response.response_id} className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">{response.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(response.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {req.status === "OPEN" && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <p className="text-sm text-blue-700">
                    📧 When you submit a reply, an email notification will be automatically sent to the user at: <strong>{req.email}</strong>
                  </p>
                </div>
                <textarea
                  rows={3}
                  placeholder="Write your reply..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={replyText[req.ticket_id] || ""}
                  onChange={(e) => handleReplyChange(req.ticket_id, e.target.value)}
                />
                <button
                  onClick={() => handleReplySubmit(req.ticket_id)}
                  disabled={submittingReply[req.ticket_id]}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReply[req.ticket_id] ? "Sending..." : "Submit Reply & Send Email"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
