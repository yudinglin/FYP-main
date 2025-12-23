// components/ReviewBubble.jsx
import React, { useState } from "react";
import { submitReview } from "../../core/api/user.js";
import { useAuth } from "../../core/context/AuthContext";

export default function ReviewBubble() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return null;

  async function handleSubmitReview(e) {
    e.preventDefault();

    if (rating === 0) {
      setError("Please select a rating.");
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
        alert("Thank you for your feedback!");
      } else {
        setError(res.error || "Failed to submit feedback.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40
                   flex items-center gap-2
                   px-4 py-3 rounded-full
                   bg-red-600 text-white
                   shadow-lg shadow-purple-600/30
                   hover:bg-red-700 hover:shadow-xl
                   transition-all duration-200"
        aria-label="Open feedback form"
      >
        <span className="text-sm font-medium">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">
              Share your feedback
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Your input helps us improve the platform.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        rating >= star
                          ? "text-yellow-400"
                          : "text-slate-300"
                      }`}
                      aria-label={`Rate ${star}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  required
                  placeholder="Tell us what worked well or what can be improved..."
                  className="w-full rounded-lg border border-slate-200
                             px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm rounded-lg
                             bg-slate-100 text-slate-700
                             hover:bg-slate-200 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm rounded-lg
                             bg-red-600 text-white
                             hover:bg-purple-700
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition"
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
