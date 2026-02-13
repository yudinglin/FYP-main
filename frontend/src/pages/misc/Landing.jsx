import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../../core/api/client";

export default function Landing() {
  const [reviews, setReviews] = useState([]);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews`)
      .then((res) => res.json())
      .then((data) => setReviews(Array.isArray(data) ? data : data.reviews))
      .catch((err) => console.error("Review fetch error:", err));
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-white pt-32 pb-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-40" />
      <div className="pointer-events-none absolute -top-24 right-[-120px] h-[420px] w-[420px] rounded-full bg-red-200 blur-3xl opacity-40" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-120px] h-[380px] w-[380px] rounded-full bg-sky-100 blur-3xl opacity-40" />

      <main className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-16 px-6 md:flex-row md:items-center">

        {/* LEFT SECTION */}
        <section className="w-full md:w-1/2 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
            YouTube Network Analytics
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.2rem] leading-tight">
            Gain Deep Insights
            <br />
            With <span className="text-red-600">YouAnalyze</span>
          </h1>

          <p className="max-w-xl text-[15px] leading-relaxed text-gray-600">
            Discover creators, communities and trends hidden in YouTube&apos;s
            network graph. YouAnalyze turns complex interaction data into clear,
            actionable insights for creators, brands and analysts.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              to="/plans"
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/30 hover:bg-red-700 transition"
            >
              Get Started
            </Link>

            <button
              onClick={() => setShowDemo(true)}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition"
            >
              View Demo
            </button>
          </div>

          <p className="pt-2 text-xs text-gray-400">
            No credit card needed. Designed for creators, agencies and business users.
          </p>
        </section>

      {/* RIGHT SECTION */}
      <section className="w-full md:w-1/2 flex justify-center">
        <div
          className="relative w-full max-w-[520px] cursor-pointer group"
          onClick={() => setShowDemo(true)}
        >
          {/* Video preview */}
          <div className="relative h-[260px] rounded-3xl overflow-hidden shadow-xl border border-white/40">
            <video
              src="/prototype-demo.mp4"
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                <svg
                  className="h-6 w-6 text-red-600 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Caption card */}
          <div className="absolute -bottom-8 left-1/2 w-[92%] -translate-x-1/2 rounded-2xl bg-white/95 px-5 py-3 shadow-lg border border-gray-100 flex items-start gap-3">
            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="text-xs leading-relaxed text-gray-700">
              <span className="font-semibold text-gray-900">
                Product demo —
              </span>{" "}
              Learn how to use YouAnalyze to uncover YouTube network insights
              effortlessly.
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* ⭐ REVIEWS SECTION */}
      <section className="relative z-10 mt-36 px-6 mx-auto max-w-[1100px]">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Trusted by Users</h2>
          <p className="mt-2 text-sm text-gray-500">
            Feedback from creators and analysts using YouAnalyze
          </p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">Loading reviews...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.map((r) => (
              <div
                key={r.review_id}
                className="group relative rounded-2xl bg-white p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <span className="absolute -top-3 -left-3 text-5xl text-red-100 select-none">
                  “
                </span>

                <div className="mb-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-sm ${
                        r.rating >= star ? "text-yellow-400" : "text-gray-300"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <p className="text-gray-700 text-sm leading-relaxed mb-5">
                  {r.comment}
                </p>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center text-xs font-semibold text-red-600">
                    {r.user_name?.[0] || "U"}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800">{r.user_name}</p>
                    <p className="text-gray-400">Verified user</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🎥 DEMO VIDEO MODAL */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <button
              onClick={() => setShowDemo(false)}
              className="absolute top-6 right-6 text-white text-2xl z-50"
            >
              ✕
            </button>
            <div className="relative w-[90%] max-w-3xl rounded-2xl bg-black overflow-hidden">
              <video
                className="w-full aspect-video"
                src="/YouAnalyze-demo.mp4"
                controls
                autoPlay
              />
            </div>
          </div>

      )}
    </div>
  );
}
