import React from "react";
// frontend/src/pages/misc/Landing.jsx
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="relative w-full min-h-screen bg-white pt-32 pb-24 overflow-hidden">

      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-40" />

      <div className="pointer-events-none absolute -top-24 right-[-120px] h-[420px] w-[420px] rounded-full bg-red-200 blur-3xl opacity-40" />

      <div className="pointer-events-none absolute bottom-[-180px] left-[-120px] h-[380px] w-[380px] rounded-full bg-sky-100 blur-3xl opacity-40" />

      <main className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-16 px-6 md:flex-row md:items-center">
        <section className="w-full md:w-1/2 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
            YouTube Network Analytics
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.2rem] leading-tight">
            Gain Deep Insights
            <br />
            With{" "}
            <span className="text-red-600">
              YouAnalyze
            </span>
          </h1>

          <p className="max-w-xl text-[15px] leading-relaxed text-gray-600">
            Discover creators, communities and trends hidden in YouTube&apos;s
            network graph. YouAnalyze turns complex interaction data into clear,
            actionable insights for creators, brands and analysts.
          </p>


          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/30 hover:bg-red-700 transition"
            >
              Get Started
            </Link>

            <Link
              to="/analytics"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition"
            >
              View Demo
            </Link>
          </div>

          <p className="pt-2 text-xs text-gray-400">
            No credit card needed. Designed for creators, agencies and business users.
          </p>
        </section>


        <section className="w-full md:w-1/2 flex justify-center">
          <div className="relative w-full max-w-[520px]">

            <div className="h-[260px] rounded-3xl bg-gradient-to-br from-red-300 via-red-300 to-red-400 shadow-xl shadow-red-300/40 border border-white/40 flex items-center justify-center">
              <span className="text-sm font-semibold tracking-wide text-white/80">
                Live Network Snapshot
              </span>
            </div>

    
            <div className="absolute -bottom-8 left-1/2 w-[92%] -translate-x-1/2 rounded-2xl bg-white/95 px-5 py-3 shadow-lg border border-gray-100 flex items-start gap-3">
              <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />

              <div className="text-xs leading-relaxed text-gray-700">
                <span className="font-semibold text-gray-900">
                  Example: Creator centrality —
                </span>{" "}
                Top 1% creators drive 47% of all cross-channel
                interactions.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
