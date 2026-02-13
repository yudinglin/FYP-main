import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../core/api/client";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/pricing");
        if (!res.ok) {
          throw new Error("Failed to fetch plans");
        }

        const data = await res.json();
        setPlans(data.plans);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setError(err.message || "Failed to load plans");
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const getPlanIdentifier = (plan) => {
    const nameLower = (plan.name || "").toLowerCase();
    const roleLower = (plan.target_role || "").toLowerCase();

    if (nameLower.includes("creator") || roleLower === "creator") {
      return "creator";
    }

    if (nameLower.includes("business") || roleLower === "business") {
      return "business";
    }

    return plan.plan_id;
  };

  const sortedPlans = [...plans].sort((a, b) => {
    const aRole = (a.target_role || "").toLowerCase();
    const bRole = (b.target_role || "").toLowerCase();

    const order = { creator: 0, business: 1 };
    const aKey = order[aRole] ?? 99;
    const bKey = order[bRole] ?? 99;

    if (aKey !== bKey) return aKey - bKey;

    return (a.plan_id ?? 0) - (b.plan_id ?? 0);
  });

  if (loading) {
    return (
      <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading plans: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-12">Choose Your Plan</h1>

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No plans available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {sortedPlans.map((plan) => {
            const features = plan.features;
            const planId = getPlanIdentifier(plan);

            return (
              <div
                key={plan.plan_id}
                className="bg-white rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transition-transform"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>

                  {plan.description && (
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                  )}

                  <div className="text-3xl font-extrabold mb-6">
                    ${plan.price_monthly}
                    <span className="text-base font-normal">/mo</span>
                  </div>

                  {features.length > 0 && (
                    <ul className="text-gray-700 mb-6 space-y-2">
                      {features.map((feature, index) => (
                        <li key={index}>✔ {feature}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <Link
                  to={`/payment?plan=${planId}&plan_id=${plan.plan_id}`}
                  className="block text-center bg-red-600 text-white py-3 rounded-full font-medium hover:bg-red-700 transition"
                >
                  Get Started
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
