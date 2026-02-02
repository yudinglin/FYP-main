import React, { useEffect, useState } from "react";
import { useAuth } from "../../core/context/AuthContext";

export default function AdminDashboard() {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch users from backend (admin)
  useEffect(() => {
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setLoading(true);
    setError("");

    fetch("http://localhost:5000/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load users");

        // support either { users: [...] } or direct array [...]
        const list = Array.isArray(data) ? data : (data.users || []);
        setUsers(list);
      })
      .catch((err) => setError(err.message || "Error fetching users"))
      .finally(() => setLoading(false));
  }, [token]);

  // Filter users based on selected role & status
  const filteredUsers = users.filter((user) => {
    const role = (user.role || "").toUpperCase();
    const status = (user.status || "").toUpperCase();

    const roleMatch =
      roleFilter === "All" || role === roleFilter.toUpperCase();

    const statusMatch =
      statusFilter === "All" || status === statusFilter.toUpperCase();

    return roleMatch && statusMatch;
  });

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      {/* Header */}
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
            <h2 className="text-sm font-semibold text-slate-900">User Management</h2>
          </div>

          {/* Filters */}
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

          {error && (
            <div className="py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Users Table */}
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
              {!loading && !error && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = (user.status || "").toLowerCase();
                  return (
                    <tr key={user.user_id}>
                      <td className="py-2 pr-4">{user.email}</td>
                      <td className="py-2 pr-4">{user.role}</td>
                      <td className="py-2 pr-4">{user.status}</td>
                      <td className="py-2 pr-4 text-right">
                        {status === "active" ? (
                          <button className="px-4 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition w-24">
                            Suspend
                          </button>
                        ) : (
                          <button className="px-4 py-1 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition w-24">
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
