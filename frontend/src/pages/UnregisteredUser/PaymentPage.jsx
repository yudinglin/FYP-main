import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../core/hooks/useAuth.js";
import { apiRequest } from "../../core/api/client";

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // URL params
  const planParam = searchParams.get("plan"); // creator | business
  const planIdParam = searchParams.get("plan_id");

  const role = useMemo(() => planParam || "creator", [planParam]);

  // Plan state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Fetch plan from backend
  useEffect(() => {
    async function fetchPlanDetails() {
      setLoading(true);
      setError("");

      try {
        const r = await apiRequest("/api/pricing");
        if (!r.ok) throw new Error("Failed to fetch plans");

        const data = r.data;
        const plans = Array.isArray(data?.plans) ? data.plans : [];

        let plan = null;

        // Prefer plan_id
        if (planIdParam) {
          plan = plans.find((p) => String(p.plan_id) === String(planIdParam));
        }

        // Fallback to role match
        if (!plan) {
          plan = plans.find((p) => {
            const target = String(p?.target_role || "").toLowerCase();
            const name = String(p?.name || "").toLowerCase();
            return target === role || name.includes(role);
          });
        }

        if (!plan) throw new Error("Invalid plan");

        setSelectedPlan(plan);
      } catch (err) {
        console.error("Failed to fetch plan details:", err);
        setSelectedPlan(null);
        setError("Failed to load plan");
      } finally {
        setLoading(false);
      }
    }

    fetchPlanDetails();
  }, [role, planIdParam]);

  // helpers
  const price = Number(selectedPlan?.price_monthly ?? selectedPlan?.price ?? 0);

  const features = Array.isArray(selectedPlan?.features)
    ? selectedPlan.features
    : typeof selectedPlan?.features === "string"
      ? selectedPlan.features.split("\n").filter((f) => f.trim() !== "")
      : [];

  function validateForm() {
    if (!email.trim()) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email";
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
  }

  // Continue to card payment (DO NOT process payment here)
  function handleContinueToPayment() {
    const msg = validateForm();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");

    navigate("/card-payment", {
      state: {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role, // IMPORTANT: keep role from URL, not target_role
        selectedPlan, // includes price_monthly + features array
      },
    });
  }

  // UI states
  if (loading || !selectedPlan) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{error ? error : "Loading plan..."}</p>
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

            <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
            {selectedPlan.description && (
              <p className="text-gray-600 mt-2">{selectedPlan.description}</p>
            )}

            <div className="text-4xl font-extrabold my-6">
              ${price.toFixed(2)}
              <span className="text-lg font-normal text-gray-600">/mo</span>
            </div>

            {/* Free Trial Notice */}
            <div className="flex items-start bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-200 rounded-full mr-4">
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-lg font-semibold text-gray-900 mb-1">
                  Free Trial Offer
                </p>
                <p className="text-sm text-gray-700">
                  Enjoy your first <span className="font-medium">30 days completely free</span>.
                  Billing starts on day 31. Cancel anytime before then with no charges.
                </p>
              </div>
            </div>

            <h4 className="font-semibold mb-3">Features:</h4>
            {features.length === 0 ? (
              <p className="text-gray-500">No features listed for this plan.</p>
            ) : (
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✔</span>
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Create Your Account</h2>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full border rounded-lg px-4 py-2"
                disabled={busy}
              />

              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full border rounded-lg px-4 py-2"
                disabled={busy}
              />

              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full border rounded-lg px-4 py-2"
                disabled={busy}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                className="w-full border rounded-lg px-4 py-2"
                disabled={busy}
              />

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={busy}
                className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
