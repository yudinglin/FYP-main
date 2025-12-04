import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";

export default function AdminSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  if (user.role?.toLowerCase() !== "admin") {
    navigate("/");
    return null;
  }

  const [view, setView] = useState("pending"); // "pending" or "resolved"

  const [requests, setRequests] = useState([
    {
      id: 1,
      userEmail: "creator1@example.com",
      category: "technical",
      subject: "Issue with analytics",
      message: "I can't see my latest video stats.",
      reply: "",
      status: "Pending",
    },
    {
      id: 2,
      userEmail: "creator2@example.com",
      category: "billing",
      subject: "Billing question",
      message: "I was charged twice for my plan.",
      reply: "Refunded already.",
      status: "Resolved",
    },
  ]);

  const [replyText, setReplyText] = useState({});

  const handleReplyChange = (id, value) => {
    setReplyText({ ...replyText, [id]: value });
  };

  const handleReplySubmit = (id) => {
    setRequests(
      requests.map((req) =>
        req.id === id
          ? { ...req, reply: replyText[id] || "", status: "Resolved" }
          : req
      )
    );
    setReplyText({ ...replyText, [id]: "" });
  };

  const filteredRequests = requests.filter(
    (r) => (view === "pending" ? r.status === "Pending" : r.status === "Resolved")
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

        {filteredRequests.length === 0 && (
          <p className="text-gray-500">No {view} requests at the moment.</p>
        )}

        {filteredRequests.map((req) => (
          <div
            key={req.id}
            className="bg-white shadow rounded-2xl p-6 flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold text-gray-700">{req.subject}</p>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  req.status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {req.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">From: {req.userEmail}</p>
            <p className="text-gray-500 text-sm">Category: {req.category}</p>
            <p className="text-gray-600">{req.message}</p>

            {req.status === "Pending" && (
              <>
                <textarea
                  rows={3}
                  placeholder="Write your reply..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={replyText[req.id] || ""}
                  onChange={(e) => handleReplyChange(req.id, e.target.value)}
                />
                <button
                  onClick={() => handleReplySubmit(req.id)}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Submit Reply
                </button>
              </>
            )}

            {req.reply && (
              <p className="mt-2 text-gray-800 font-medium">Reply: {req.reply}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
