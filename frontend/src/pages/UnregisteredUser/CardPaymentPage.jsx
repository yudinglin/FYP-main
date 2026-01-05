import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, Lock, HelpCircle, Check } from "lucide-react";
import { useAuth } from "../../core/hooks/useAuth.js";

const CardPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const { email, password, firstName, lastName, role, selectedPlan } = location.state || {};

  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + " / " + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, "");
    if (value.length <= 16) {
      setCardNumber(formatCardNumber(value));
    }
  };

  const handleExpiryDateChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) {
      setExpiryDate(formatExpiryDate(value));
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 3) {
      setCvv(value);
    }
  };

  const handleCompletePurchase = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      // Process payment and register - USE THE SAME ENDPOINT AS PaymentPage
      const response = await fetch("http://localhost:5000/api/payment/process", {
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
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
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
      {/* Success Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Payment Successful!</h2>
            <p className="text-gray-600 mb-2">Successfully registered</p>
            <p className="text-gray-600 mb-2">Check your email for invoice</p>
            <p className="text-gray-500 text-sm">Redirecting you to your dashboard...</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleCompletePurchase}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* LEFT: Payment method */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Payment method</h2>

          {/* Credit card option with icons */}
          <div className="border-2 border-grey-500 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="font-semibold text-lg">Credit or debit card</span>
            </div>

            {/* Payment card logos */}
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold">VISA</div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                <div className="w-8 h-8 bg-orange-400 rounded-full -ml-3"></div>
              </div>
              <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">AMERICAN<br/>EXPRESS</div>
              <div className="flex items-center gap-1">
                <div className="bg-blue-500 w-6 h-5 rounded-sm"></div>
                <div className="bg-red-500 w-6 h-5 rounded-sm"></div>
              </div>
              <Lock className="w-5 h-5 text-gray-400 ml-auto" />
            </div>

            {/* Card number input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Card number</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="0000 0000 0000 0000"
                  className="w-full border-2 border-gray-300 rounded-lg pl-12 pr-4 py-3 text-black placeholder-gray-400"
                  required
                  autoComplete="cc-number"
                  disabled={busy}
                />
              </div>
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Expiry date</label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  placeholder="MM / YY"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  required
                  autoComplete="cc-exp"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Security code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cvv}
                    onChange={handleCvvChange}
                    placeholder="CVV"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-10"
                    required
                    autoComplete="cc-csc"
                    disabled={busy}
                  />
                  <HelpCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Save card checkbox */}
          <div className="flex items-start gap-3">
            <input type="checkbox" id="save-card" className="mt-1" disabled={busy} />
            <div>
              <label htmlFor="save-card" className="font-semibold cursor-pointer">
                Save card for future orders.
              </label>
              <p className="text-sm text-gray-600 mt-1">
                This won't affect how you pay for existing subscriptions and can be managed anytime in your Account page.
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: Summary */}
        <div className="bg-gray-50 p-6 rounded-lg self-start">
          <h2 className="text-2xl font-bold mb-6">Summary</h2>

          <div className="flex justify-between mb-2">
            <span className="text-gray-700">{selectedPlan?.name}</span>
            <span className="font-semibold">$ {selectedPlan?.price}/mo</span>
          </div>

          <div className="border-t border-gray-300 pt-4 mt-4 flex justify-between font-bold text-lg">
            <span>Total now</span>
            <span>$ {selectedPlan?.price}</span>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-full font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Processing Payment..." : "Complete purchase"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CardPaymentPage;