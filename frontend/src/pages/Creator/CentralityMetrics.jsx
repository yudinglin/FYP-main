// frontend/src/pages/Creator/CentralityMetrics.jsx
import React from "react";

export default function CentralityMetrics() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">
        Centrality Metrics
      </h1>

      <p className="text-sm text-slate-500 mb-6">
        Here you can visualize the centrality metrics of your creators, channels, or campaigns.
      </p>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 h-96 flex items-center justify-center">
        <p className="text-slate-400">Graph placeholder - hook up D3 or Chart.js here</p>
      </div>
    </div>
  );
}
