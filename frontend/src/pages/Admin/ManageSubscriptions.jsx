import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../core/context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE;


function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function normStr(v) {
  return String(v ?? "").trim().toLowerCase();
}

function normUpper(v) {
  return String(v ?? "").trim().toUpperCase();
}

function toStartMs(sub) {
  const d = new Date(sub?.start_date);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function ManageSubscriptions() {
  const { token } = useAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("START_DESC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function resetView() {
    setSearchTerm("");
    setSortKey("START_DESC");
    setStatusFilter("ALL");
  }

  const fetchSubscriptions = useCallback(async () => {
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/admin/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load subscriptions");

    // ONLY FIX: normalize keys so UI can keep using email/plan
    setSubscriptions(
      (data.subscriptions || []).map((s) => ({
        ...s,
        email: s.email ?? s.user_email ?? "",
        plan: s.plan ?? s.plan_name ?? "",
      }))
    );
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    fetchSubscriptions()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, fetchSubscriptions]);

  async function updateStatus(subscriptionId, newStatus) {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/subscriptions/${subscriptionId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.subscription_id === subscriptionId
            ? { ...s, status: newStatus }
            : s
        )
      );

      setSuccess(`Subscription ${subscriptionId} updated.`);
    } catch (e) {
      setError(e.message);
    }
  }

  const visibleRows = useMemo(() => {
    const q = normStr(searchTerm);

    let rows = subscriptions.filter((s) =>
      statusFilter === "ALL" ? true : normUpper(s.status) === statusFilter
    );

    if (q) {
      rows = rows.filter((s) => {
        return (
          normStr(s.subscription_id).includes(q) ||
          normStr(s.email).includes(q) ||
          normStr(s.plan).includes(q)
        );
      });
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === "START_DESC") return toStartMs(b) - toStartMs(a);
      if (sortKey === "START_ASC") return toStartMs(a) - toStartMs(b);
      if (sortKey === "EMAIL_AZ")
        return normStr(a.email).localeCompare(normStr(b.email));
      if (sortKey === "EMAIL_ZA")
        return normStr(b.email).localeCompare(normStr(a.email));
      if (sortKey === "STATUS_AZ")
        return normUpper(a.status).localeCompare(normUpper(b.status));
      return 0;
    });

    return sorted;
  }, [subscriptions, statusFilter, searchTerm, sortKey]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Manage Subscriptions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View and control user subscriptions.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {["ALL", "ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs rounded-full ${
                  statusFilter === status
                    ? "bg-red-600 text-white"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">
              Search (Subscription ID, Email, Plan)
            </label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. 12, user@email.com, Premium"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          <div className="w-full md:w-64">
            <label className="block text-xs text-slate-500 mb-1">Sort by</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="START_DESC">Start date (newest)</option>
              <option value="START_ASC">Start date (oldest)</option>
              <option value="EMAIL_AZ">Email (A–Z)</option>
              <option value="EMAIL_ZA">Email (Z–A)</option>
              <option value="STATUS_AZ">Status (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                selectedIds.forEach((id) => updateStatus(id, "SUSPENDED"));
                setSelectedIds(new Set());
              }}
              disabled={selectedIds.size === 0}
              className="px-3 py-2 text-xs rounded-lg bg-amber-600 text-white disabled:opacity-40"
            >
              Suspend selected
            </button>

            <button
              onClick={() => {
                if (!window.confirm("Cancel all selected subscriptions?")) return;
                selectedIds.forEach((id) => updateStatus(id, "CANCELLED"));
                setSelectedIds(new Set());
              }}
              disabled={selectedIds.size === 0}
              className="px-3 py-2 text-xs rounded-lg bg-red-600 text-white disabled:opacity-40"
            >
              Cancel selected
            </button>

            <button
              onClick={() => {
                selectedIds.forEach((id) => updateStatus(id, "ACTIVE"));
                setSelectedIds(new Set());
              }}
              disabled={selectedIds.size === 0}
              className="px-3 py-2 text-xs rounded-lg bg-teal-600 text-white disabled:opacity-40"
            >
              Reactivate selected
            </button>
          </div>

          <button
            onClick={resetView}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-700"
          >
            Reset filters
          </button>
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-sm text-slate-600">
            Loading subscriptions...
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && !error && (
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 border-b">
              <tr>
                <th className="py-2">
                  <input
                    type="checkbox"
                    checked={
                      visibleRows.length > 0 &&
                      visibleRows.every((r) => selectedIds.has(r.subscription_id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(
                          new Set(visibleRows.map((r) => r.subscription_id))
                        );
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="py-2">Subscription ID</th>
                <th className="py-2">Email</th>
                <th className="py-2">Plan</th>
                <th className="py-2">Status</th>
                <th className="py-2">Start</th>
                <th className="py-2">End</th>
              </tr>
            </thead>

            <tbody className="text-slate-700">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-slate-400">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((sub) => {
                  const st = (sub.status || "").toUpperCase();

                  return (
                    <tr
                      key={sub.subscription_id}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sub.subscription_id)}
                          onChange={() => toggleSelect(sub.subscription_id)}
                        />
                      </td>
                      <td className="py-2">{sub.subscription_id}</td>
                      <td className="py-2">{sub.email || "-"}</td>
                      <td className="py-2">{sub.plan || "-"}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            st === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : st === "SUSPENDED"
                              ? "bg-amber-100 text-amber-700"
                              : st === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {st || "-"}
                        </span>
                      </td>
                      <td className="py-2">{formatDateTime(sub.start_date)}</td>
                      <td className="py-2">{formatDateTime(sub.end_date)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
