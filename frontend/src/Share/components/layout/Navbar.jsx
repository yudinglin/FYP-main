import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../../core/context/AuthContext";
import { NAV_ITEMS } from "./navConfig";

export default function Navbar() {
  const auth = useAuth() || {};
  const { user, logout } = auth;
  const navigate = useNavigate();

  const role = user?.role?.toLowerCase() || "unregistered";

  const dashboardPath = {
    creator: "/dashboard",
    business: "/dashboard/business",
    admin: "/dashboard/admin",
  }[role] || "/";


  // Select the current character from the menu; if not found, go back.
  const rawMenu =
    (NAV_ITEMS && NAV_ITEMS[role]) ||
    (NAV_ITEMS && NAV_ITEMS["unregistered"]) ||
    [];

  const menu = Array.isArray(rawMenu) ? rawMenu : [];

  const avatar = user?.name
    ? user.name.charAt(0).toUpperCase()
    : "U";

  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-[1300px] px-10 py-4 flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm">
            YA
          </div>
          <span className="font-extrabold text-2xl text-gray-900 tracking-tight">
            You<span className="text-red-600">Analyze</span>
          </span>
        </Link>

        {/* Right side: Menu + Avatar */}
        <div className="flex items-center gap-8">

          {/* Menu(key and label in the navConfig) */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-gray-600">
            {menu.map((item) =>
              item.highlight ? (
                <Link
                  key={item.label}
                  to={item.path}
                  className="px-5 py-2 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition"
                >
                  {item.label}
                </Link>
              ) : (
                <NavLink
                key={item.label}
                to={item.label === "Dashboard" ? dashboardPath : item.path}
                className="hover:text-gray-900"
              >
                {item.label}
              </NavLink>
              )
            )}
          </nav>

          {/* avatar */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold"
              >
                {avatar}
              </button>

              {/* avatar meanu */}
              {open && (
                <div className="
                  absolute right-0 mt-2 w-40
                  bg-white shadow-lg rounded-lg border border-gray-200
                  py-2 text-gray-700
                ">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>

                 <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                    navigate("/"); // redirect to Landing page
                  }}
                  className="w-full text-left block px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
