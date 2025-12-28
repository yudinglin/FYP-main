import React, { useState, useEffect } from "react";
import { apiRequest } from "../../core/api/client.js";

export default function EditPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to parse description to extract description text and features
  const parsePlanData = (plan) => {
    let description = plan.description || "";
    let features = [];

    if (description) {
      try {
        const parsed = JSON.parse(description);
        if (parsed.features && Array.isArray(parsed.features)) {
          features = parsed.features;
          description = parsed.description || "";
        } else if (Array.isArray(parsed)) {
          features = parsed;
          description = "";
        }
      } catch (e) {
        // Not JSON, use description as-is
      }
    }

    return {
      ...plan,
      description: description,
      features: features,
      price: plan.price_monthly || plan.price || 0,
    };
  };

  // Helper function to format plan data for saving (combine description and features as JSON)
  const formatPlanForSave = (plan) => {
    const descriptionJson = JSON.stringify({
      description: plan.description || "",
      features: plan.features || [],
    });
    return {
      name: plan.name,
      description: descriptionJson,
      price_monthly: plan.price,
      target_role: plan.target_role || "BOTH",
      max_channels: plan.max_channels || 1,
      max_saved_graphs: plan.max_saved_graphs || 5,
      is_active: plan.is_active !== undefined ? plan.is_active : true,
    };
  };

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await apiRequest("/api/admin/plans");
        if (response.ok && response.data.plans) {
          // Parse each plan to extract description and features
          const parsedPlans = response.data.plans.map(parsePlanData);
          setPlans(parsedPlans);
        } else {
          setError(response.error || "Failed to fetch plans");
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setError(err.message || "Failed to fetch plans");
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
    setError(null);
    try {
      // Update each plan individually
      const updatePromises = plans.map(async (plan) => {
        const planData = formatPlanForSave(plan);
        const response = await apiRequest(`/api/admin/plans/${plan.plan_id}`, {
          method: "PUT",
          body: JSON.stringify(planData),
        });
        if (!response.ok) {
          throw new Error(`Failed to update ${plan.name}: ${response.error}`);
        }
        return response.data;
      });

      await Promise.all(updatePromises);
      alert("Pricing updated successfully!");
      
      // Refresh plans to get updated data
      const response = await apiRequest("/api/admin/plans");
      if (response.ok && response.data.plans) {
        const parsedPlans = response.data.plans.map(parsePlanData);
        setPlans(parsedPlans);
      }
    } catch (err) {
      console.error("Failed to save:", err);
      setError(err.message || "Failed to update pricing");
      alert(`Failed to update pricing: ${err.message}`);
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

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {plans.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No plans found. Please add plans to the database first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {plans.map((plan, planIndex) => (
              <div
                key={plan.plan_id}
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
                  {(plan.features || []).map((feature, featureIndex) => (
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
        )}

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