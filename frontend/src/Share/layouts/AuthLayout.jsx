import React from "react";
import Navbar from "../components/layout/Navbar.jsx";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex justify-center px-4 pt-32 pb-10">
        <div className="w-full max-w-md bg-white shadow-xl shadow-slate-200/60 rounded-2xl p-8 border border-slate-100">
          {children}
        </div>
      </main>
    </div>
  );
}
