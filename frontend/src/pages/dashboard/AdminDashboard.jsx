import React, { useState } from "react";

export default function AdminDashboard() {
  // Mock users (replace with API fetch)
  const [users, setUsers] = useState([
    { email: "creator1@example.com", role: "CREATOR", status: "Active" },
    { email: "creator2@example.com", role: "CREATOR", status: "Suspended" },
    { email: "business1@example.com", role: "BUSINESS", status: "Active" },
    { email: "business2@example.com", role: "BUSINESS", status: "Suspended" },
  ]);

  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredUsers = users.filter((user) => {
    const roleMatch = roleFilter === "All" || user.role === roleFilter;
    const statusMatch = statusFilter === "All" || user.status === statusFilter;
    return roleMatch && statusMatch;
  });

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Admin control panel
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Manage user accounts and roles.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              User management
            </h2>
            <button className="text-xs text-slate-400 hover:text-slate-600">
              View all
            </button>
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
                {role === "All"
                  ? "All Roles"
                  : role.charAt(0) + role.slice(1).toLowerCase()}
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={index}>
                    <td className="py-2 pr-4">{user.email}</td>
                    <td className="py-2 pr-4">{user.role}</td>
                    <td className="py-2 pr-4">{user.status}</td>
                    <td className="py-2 pr-4 text-right">
                      {user.status === "Active" ? (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
