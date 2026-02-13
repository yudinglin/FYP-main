import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../core/context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE;


export default function AdminDashboard() {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Failed to load users");

    const list = Array.isArray(data) ? data : (data.users || []);
    setUsers(list);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setLoading(true);
    setError("");

    fetchUsers()
      .catch((err) => setError(err.message || "Error fetching users"))
      .finally(() => setLoading(false));
  }, [token, fetchUsers]);

  async function updateUserStatus(userId, newStatus) {
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    try {
      setError("");

      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update status");

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (e) {
      setError(e.message || "Failed to update status");
    }
  }

  const visibleUsers = useMemo(() => {
    // 1) Sort admins first (stable within groups by email)
    const sorted = [...users].sort((a, b) => {
      const ar = (a.role || "").toLowerCase();
      const br = (b.role || "").toLowerCase();

      const aIsAdmin = ar === "admin";
      const bIsAdmin = br === "admin";

      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      return String(a.email || "").localeCompare(String(b.email || ""));
    });

    // 2) Apply filters
    return sorted.filter((user) => {
      const role = (user.role || "").toUpperCase();
      const status = (user.status || "").toUpperCase();

      const roleMatch =
        roleFilter === "All" || role === roleFilter.toUpperCase();

      const statusMatch =
        statusFilter === "All" || status === statusFilter.toUpperCase();

      return roleMatch && statusMatch;
    });
  }, [users, roleFilter, statusFilter]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Admin Control Panel
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          View and manage user accounts.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              User Management
            </h2>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {["All", "CREATOR", "BUSINESS"].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  roleFilter === role
                    ? "bg-red-600 text-white"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
              >
                {role === "All" ? "All Roles" : role}
              </button>
            ))}

            {["All", "Active", "Suspended"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  statusFilter === status
                    ? "bg-red-600 text-white"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {loading && (
            <div className="py-3 text-sm text-slate-500">Loading users...</div>
          )}

          {error && <div className="py-3 text-sm text-red-600">{error}</div>}

          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 border-b border-slate-100">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="text-slate-700">
              {!loading && !error && visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const roleLower = (user.role || "").toLowerCase();
                  const statusLower = (user.status || "").toLowerCase();
                  const isAdmin = roleLower === "admin";

                  return (
                    <tr key={user.user_id}>
                      <td className="py-2 pr-4">{user.email}</td>
                      <td className="py-2 pr-4">{user.role}</td>
                      <td className="py-2 pr-4">{user.status}</td>

                      <td className="py-2 pr-4 text-right">
                        {statusLower === "active" ? (
                          <button
                            onClick={() =>
                              !isAdmin && updateUserStatus(user.user_id, "SUSPENDED")
                            }
                            disabled={isAdmin}
                            title={isAdmin ? "Admin accounts cannot be suspended" : ""}
                            className={`px-4 py-1 text-sm font-medium text-white rounded-lg transition w-24 ${
                              isAdmin
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              !isAdmin && updateUserStatus(user.user_id, "ACTIVE")
                            }
                            disabled={isAdmin}
                            title={isAdmin ? "Admin accounts cannot be changed here" : ""}
                            className={`px-4 py-1 text-sm font-medium text-white rounded-lg transition w-24 ${
                              isAdmin
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-teal-500 hover:bg-teal-600"
                            }`}
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
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
