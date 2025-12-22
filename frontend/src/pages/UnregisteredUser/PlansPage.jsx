import React from "react";
import { Link } from "react-router-dom";

export default function PlansPage() {
  return (
    <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-12">
        Choose Your Plan
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

        {/* Content Creator Plan */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transition-transform">
          <div>
            <h2 className="text-2xl font-bold mb-2">Content Creator</h2>
            <p className="text-gray-600 mb-6">
              Perfect for YouTubers who want analytics, predictions, and network graphs.
            </p>
            <div className="text-3xl font-extrabold mb-6">$12<span className="text-base font-normal">/mo</span></div>
            <ul className="text-gray-700 mb-6 space-y-2">
              <li>✔ YouTube analytics</li>
              <li>✔ Network graph visualization</li>
              <li>✔ Engagement metrics</li>
              <li>✔ Growth prediction</li>
            </ul>
          </div>
          <Link
            to="/payment?plan=creator"
            className="block text-center bg-red-600 text-white py-3 rounded-full font-medium hover:bg-red-700 transition"
          >
            Get Started
          </Link>
        </div>

        {/* Business Plan */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transition-transform">
          <div>
            <h2 className="text-2xl font-bold mb-2">Business</h2>
            <p className="text-gray-600 mb-6">
              For companies analyzing multiple channels & industry trends.
            </p>
            <div className="text-3xl font-extrabold mb-6">$30<span className="text-base font-normal">/mo</span></div>
            <ul className="text-gray-700 mb-6 space-y-2">
              <li>✔ Multi-channel support</li>
              <li>✔ Industry network graphs</li>
              <li>✔ Brand centrality analysis</li>
              <li>✔ Campaign reach prediction</li>
            </ul>
          </div>
          <Link
            to="/payment?plan=business"
            className="block text-center bg-red-600 text-white py-3 rounded-full font-medium hover:bg-red-700 transition"
          >
            Get Started
          </Link>
        </div>

      </div>
    </div>
  );
}