import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-5xl font-extrabold text-slate-900 mb-3">404</h1>
      <p className="text-slate-500 mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
