export default function AdminDashboard() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Admin control panel
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Manage user accounts, roles and respond to support tickets.
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
              <tr>
                <td className="py-2 pr-4">creator@example.com</td>
                <td className="py-2 pr-4">CREATOR</td>
                <td className="py-2 pr-4">Active</td>
                <td className="py-2 pr-4 text-right">
                  <button className="text-xs text-indigo-600 hover:underline mr-2">
                    Make BUSINESS
                  </button>
                  <button className="text-xs text-rose-600 hover:underline">
                    Suspend
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Support tickets
            </h2>
            <button className="text-xs text-slate-400 hover:text-slate-600">
              View inbox
            </button>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <p className="font-medium text-slate-900">
                  Campaign tracking issue
                </p>
                <p className="text-[11px] text-slate-400">
                  From: brand@demo.com · Open 2h ago
                </p>
              </div>
              <button className="text-xs text-indigo-600 hover:underline">
                Reply
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
