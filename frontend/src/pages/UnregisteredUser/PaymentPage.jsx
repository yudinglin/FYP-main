import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../core/hooks/useAuth.js";

/**
 * Parse plan description (JSON or plain text)
 */
function parsePlanDescription(description) {
  if (!description) return { descriptionText: "", features: [] };

  try {
    const parsed = JSON.parse(description);
    return {
      descriptionText: parsed.description || "",
      features: parsed.features || [],
    };
  } catch {
    return {
      descriptionText: description,
      features: [],
    };
  }
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // URL params
  const planParam = searchParams.get("plan"); // creator | business
  const planIdParam = searchParams.get("plan_id");

  // Plan state (REPLACES hardcoded planDetails)
  const [selectedPlan, setSelectedPlan] = useState(null);
  const role = planParam || "creator";

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Navigate to card payment (UNCHANGED)
   */
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

  /**
   * Fetch plan from backend
   */
  useEffect(() => {
    async function fetchPlanDetails() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/pricing");
        if (!res.ok) throw new Error("Failed to fetch plans");

        const data = await res.json();
        if (!data.plans) throw new Error("No plans found");

        let plan = null;

        // 1️⃣ Prefer plan_id
        if (planIdParam) {
          plan = data.plans.find(
            (p) => String(p.plan_id) === String(planIdParam)
          );
        }

        // 2️⃣ Fallback to role
        if (!plan && role) {
          plan = data.plans.find(
            (p) =>
              p.target_role === role ||
              p.name.toLowerCase().includes(role)
          );
        }

        if (!plan) throw new Error("Invalid plan");

        const { descriptionText, features } =
          parsePlanDescription(plan.description);

        setSelectedPlan({
          plan_id: plan.plan_id,
          name: plan.name,
          price: plan.price_monthly,
          description: descriptionText,
          features,
        });
      } catch (err) {
        console.error("Failed to fetch plan details:", err);
        setSelectedPlan(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPlanDetails();
  }, [role, planIdParam]);

  /**
   * Handle payment (UNCHANGED LOGIC)
   */
  async function handlePayment(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
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
          plan_id: selectedPlan.plan_id,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.message || "Payment failed");

      setPaymentSuccess(true);

      setTimeout(async () => {
        try {
          await login(email, password);
          navigate(
            role === "business"
              ? "/dashboard/business"
              : "/dashboard"
          );
        } catch {
          navigate("/login");
        }
      }, 2000);
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  // ---------------- UI STATES ----------------

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
          <p className="text-gray-500">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!planParam || loading || !selectedPlan) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading plan...</p>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------

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
            <p className="text-gray-600 mt-2">{selectedPlan.description}</p>

            <div className="text-4xl font-extrabold my-6">
              ${selectedPlan.price}
              <span className="text-lg font-normal text-gray-600">/mo</span>
            </div>

          {/* Free Trial Notice - Neutral Theme */}
          <div className="flex items-start bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
            {/* Icon */}
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

            {/* Text Content */}
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
            <ul className="space-y-2">
              {selectedPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✔</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Create Your Account</h2>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handlePayment}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border rounded-lg px-4 py-2"
              />

              <button
                type="button"
                onClick={handlePayAndRegister}
                disabled={busy}
                className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                Continue to Payment
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

