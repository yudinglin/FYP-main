import React, { useState, useEffect } from "react";

export default function EditPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("http://localhost:5000/api/pricing");
        const data = await res.json();
        setPlans(data.plans); // assuming your API returns { plans: [...] }
      } catch (err) {
        console.error(err);
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

  const handleSave = async () => {
    try {
      await fetch("http://localhost:5000/api/pricing", {
        method: "PUT", // or PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans }),
      });
      alert("Pricing updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update pricing");
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">
        Edit Pricing Plans
      </h1>

      <div className="space-y-4">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2"
          >
            <input
              type="text"
              value={plan.name}
              onChange={(e) => handleChange(index, "name", e.target.value)}
              className="border px-2 py-1 rounded"
              placeholder="Plan Name"
            />
            <input
              type="number"
              value={plan.price}
              onChange={(e) => handleChange(index, "price", e.target.value)}
              className="border px-2 py-1 rounded"
              placeholder="Price"
            />
            <textarea
              value={plan.features}
              onChange={(e) => handleChange(index, "features", e.target.value)}
              className="border px-2 py-1 rounded"
              placeholder="Features (comma-separated)"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
