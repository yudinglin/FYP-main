import React from "react";
import Navbar from "../components/layout/Navbar.jsx";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-white">
      <Navbar />

      <main className="pt-24">
        {children}
      </main>
    </div>
  );
}
