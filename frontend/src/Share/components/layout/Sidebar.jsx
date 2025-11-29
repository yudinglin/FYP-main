import { Link, useLocation } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Overview" },
  { to: "/dashboard/creator", label: "Creator" },
  { to: "/dashboard/business", label: "Business" },
  { to: "/dashboard/admin", label: "Admin" },
  { to: "/analytics", label: "Analytics" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:block w-52 border-r border-gray-200 pt-20 pl-4 pr-2">
      <nav className="space-y-1 text-sm">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded-lg px-3 py-2 ${
                active
                  ? "bg-red-50 text-red-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
