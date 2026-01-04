import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../core/hooks/useAuth.js";

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // Get plan from URL parameter
  const planParam = searchParams.get("plan"); // "creator" or "business"

  // Plan details mapping
  const planDetails = {
    creator: {
      name: "Content Creator",
      price: 12,
      description: "Perfect for YouTubers who want analytics, predictions, and network graphs.",
      features: [
        "YouTube analytics",
        "Network graph visualization",
        "Engagement metrics",
        "Growth prediction"
      ]
    },
    business: {
      name: "Business",
      price: 30,
      description: "For companies analyzing multiple channels & industry trends.",
      features: [
        "Multi-channel support",
        "Industry network graphs",
        "Brand centrality analysis",
        "Campaign reach prediction"
      ]
    }
  };

  const selectedPlan = planDetails[planParam] || planDetails.creator;
  const role = planParam || "creator";

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const handlePayAndRegister = () => {
    navigate("/card-payment", {
      state: {
        email,
        password,
        firstName,
        lastName,
        role,
        selectedPlan,
      },
    });
  };

  // Fetch plan details from backend (optional - for consistency)
  useEffect(() => {
    async function fetchPlanDetails() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/pricing");
        const data = await res.json();
        if (data.plans) {
          // Find matching plan
          const plan = data.plans.find(p => 
            p.name.toLowerCase().includes(role) || 
            (role === "creator" && p.name.includes("Creator")) ||
            (role === "business" && p.name === "Business")
          );
          if (plan) {
            // Could update plan details from backend here if needed
          }
        }
      } catch (err) {
        console.error("Failed to fetch plan details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlanDetails();
  }, [role]);

  async function handlePayment(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      // Process payment and register
      const resp = await fetch("http://localhost:5000/api/payment/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role,
          plan_name: selectedPlan.name,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data.message || "Payment failed");
      }

      // Payment successful
      setPaymentSuccess(true);

      // Auto login after 2 seconds
      setTimeout(async () => {
        try {
          await login(email, password);
          // Navigate based on role
          if (role === "creator") {
            navigate("/dashboard");
          } else if (role === "business") {
            navigate("/dashboard/business");
          } else {
            navigate("/dashboard");
          }
        } catch (err) {
          // If auto-login fails, redirect to login page
          navigate("/login");
        }
      }, 2000);

    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (paymentSuccess) {
    return (
      <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            Successfully registered
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!planParam || !planDetails[planParam]) {
    return (
      <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Plan</h2>
          <p className="text-gray-600 mb-4">Please select a plan first.</p>
          <button
            onClick={() => navigate("/plans")}
            className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">
          Complete Your Registration & Payment
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Plan Summary</h2>
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedPlan.name}
              </h3>
              <p className="text-gray-600 mt-2">{selectedPlan.description}</p>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-extrabold text-gray-900 mb-2">
                ${selectedPlan.price}
                <span className="text-lg font-normal text-gray-600">/mo</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Features:</h4>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Create Your Account</h2>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handlePayment}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePayAndRegister}
                  disabled={busy}
                  className="w-full py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  Continue to Payment
                </button>


                <p className="mt-4 text-xs text-gray-500 text-center">
                  By clicking "Pay", you agree to our Terms of Service and Privacy Policy.
                  Payment is simulated and no actual charges will be made.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
