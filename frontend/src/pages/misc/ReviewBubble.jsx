// components/ReviewBubble.jsx
import React, { useState } from "react";
import { submitReview } from "../../core/api/user.js";
import { useAuth } from "../../core/context/AuthContext";

export default function ReviewBubble() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Get user from context

  async function handleSubmitReview(e) {
    e.preventDefault();
    
    // Validate rating
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitReview(rating, comment);
      
      if (res.ok) {
        setOpen(false);
        setRating(0);
        setComment("");
        setError(null);
        alert("Review submitted successfully!");
      } else {
        setError(res.error || "Failed to submit review");
      }
    } catch (err) {
      console.error("Review submission error:", err);
      setError(err.message || "An error occurred while submitting your review");
    } finally {
      setLoading(false);
    }
  }

  // Don't show button if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating bubble button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-700 transition z-40"
        aria-label="Submit Review"
      >
        💬
      </button>

      {/* Modal / bubble form */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80">
            <h2 className="text-lg font-semibold mb-4">Submit Review</h2>
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <label className="text-sm text-slate-600">Rating *</label>
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${
                        rating >= star ? "text-yellow-400" : "text-gray-300"
                      } hover:scale-110 transition-transform`}
                      aria-label={`Rate ${star} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600">Comment *</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Share your experience..."
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-xs bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || rating === 0}
                  className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}