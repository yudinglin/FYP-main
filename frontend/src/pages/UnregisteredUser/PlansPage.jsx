import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("http://localhost:5000/api/pricing");
        if (!res.ok) {
          throw new Error("Failed to fetch plans");
        }
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  // Helper function to get plan identifier for URL (creator/business based on name or target_role)
  const getPlanIdentifier = (plan) => {
    const nameLower = plan.name.toLowerCase();
    if (nameLower.includes("creator") || plan.target_role === "creator") {
      return "creator";
    } else if (nameLower.includes("business") || plan.target_role === "business") {
      return "business";
    }
    // Fallback: use plan_id or name as identifier
    return plan.plan_id || plan.name.toLowerCase().replace(/\s+/g, "-");
  };

  // Helper function to parse description and features from JSON if stored as JSON
  const parsePlanDescription = (description) => {
    if (!description) return { descriptionText: "", features: [] };
    
    try {
      const parsed = JSON.parse(description);
      if (parsed.features && Array.isArray(parsed.features)) {
        return {
          descriptionText: parsed.description || "",
          features: parsed.features
        };
      } else if (Array.isArray(parsed)) {
        // If it's just an array, treat as features
        return {
          descriptionText: "",
          features: parsed
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text description
      return {
        descriptionText: description,
        features: []
      };
    }
    return { descriptionText: "", features: [] };
  };

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
      <h1 className="text-4xl font-bold text-center mb-12">
        Choose Your Plan
      </h1>

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No plans available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const { descriptionText, features } = parsePlanDescription(plan.description);
            const planId = getPlanIdentifier(plan);
            
            return (
              <div
                key={plan.plan_id}
                className="bg-white rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transition-transform"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                  {descriptionText && (
                    <p className="text-gray-600 mb-6">{descriptionText}</p>
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