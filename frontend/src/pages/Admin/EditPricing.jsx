import React, { useState, useEffect } from "react";

export default function EditPricing() {
  const [plans, setPlans] = useState([
    {
      id: "creator",
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
    {
      id: "business",
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
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("http://localhost:5000/api/pricing");
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleChange = (index, field, value) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleFeatureChange = (planIndex, featureIndex, value) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[planIndex].features[featureIndex] = value;
      return updated;
    });
  };

  const addFeature = (planIndex) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[planIndex].features.push("");
      return updated;
    });
  };

  const removeFeature = (planIndex, featureIndex) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[planIndex].features.splice(featureIndex, 1);
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("http://localhost:5000/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans }),
      });
      alert("Pricing updated successfully!");
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 pt-28 px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2">
            Edit Pricing Plans
          </h1>
          <p className="text-gray-600">
            Update pricing, descriptions, and features for your subscription plans
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {plans.map((plan, planIndex) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100 hover:border-red-300 transition-all hover:shadow-2xl"
            >
              {/* Plan Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => handleChange(planIndex, "name", e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                  placeholder="e.g., Content Creator"
                />
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={plan.description}
                  onChange={(e) => handleChange(planIndex, "description", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition"
                  placeholder="Brief description of the plan"
                />
              </div>

              {/* Price */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monthly Price ($)
                </label>
                <input
                  type="number"
                  value={plan.price}
                  onChange={(e) => handleChange(planIndex, "price", parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>

              {/* Features */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Features
                </label>
                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) =>
                          handleFeatureChange(planIndex, featureIndex, e.target.value)
                        }
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                        placeholder="Feature description"
                      />
                      <button
                        onClick={() => removeFeature(planIndex, featureIndex)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition font-semibold"
                        title="Remove feature"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addFeature(planIndex)}
                  className="mt-3 w-full px-4 py-2 border-2 border-dashed border-red-200 rounded-lg text-red-600 hover:border-red-500 hover:bg-red-50 transition font-medium"
                >
                  + Add Feature
                </button>
              </div>

              {/* Preview Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs font-bold text-red-600 mb-3 tracking-wide">PREVIEW</p>
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                  <div className="text-2xl font-extrabold text-red-600">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-600">/mo</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white text-lg font-bold rounded-full hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {saving ? "Saving Changes..." : "Save All Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}