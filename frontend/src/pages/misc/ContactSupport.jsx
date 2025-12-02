// frontend/src/pages/misc/ContactSupport.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";

export default function ContactSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Only allow non-admin users
  if (user?.role?.toLowerCase() === "admin") {
    navigate("/"); // redirect admin back to landing
    return null;
  }

  const [form, setForm] = useState({
    category: "",
    subject: "",
    message: "",
    attachment: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "attachment") {
      setForm({ ...form, attachment: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Contact Support Form Submitted:", form);
    alert("Your message has been submitted!");
    setForm({ category: "", subject: "", message: "", attachment: null });
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-10 max-w-xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Contact Support</h1>
        <p className="text-gray-600">
          Have a question or issue? Fill out the form below and our support team
          will get back to you as soon as possible.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Category */}
          <label className="flex flex-col">
            <span className="text-gray-700 font-medium">Category</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="mt-1 p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select a category</option>
              <option value="technical">Technical Issue</option>
              <option value="billing">Billing & Payments</option>
              <option value="feedback">Feedback / Suggestions</option>
              <option value="other">Other</option>
            </select>
          </label>

          {/* Subject */}
          <label className="flex flex-col">
            <span className="text-gray-700 font-medium">Subject</span>
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className="mt-1 p-2 border border-gray-300 rounded-md"
              placeholder="Enter subject"
              required
            />
          </label>

          {/* Message */}
          <label className="flex flex-col">
            <span className="text-gray-700 font-medium">Message</span>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={6}
              className="mt-1 p-2 border border-gray-300 rounded-md"
              placeholder="Write your message here..."
              required
            />
          </label>

          {/* Attachment (optional) */}
          <label className="flex flex-col">
            <span className="text-gray-700 font-medium">Attachment (optional)</span>
            <input
              type="file"
              name="attachment"
              onChange={handleChange}
              className="mt-1"
            />
          </label>

          {/* Submit button */}
          <button
            type="submit"
            className="mt-4 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold"
          >
            Submit
          </button>
        </form>

        <div className="pt-4 border-t border-gray-200 text-gray-500 text-sm">
          You can also reach us at <span className="font-medium">support@youanalyze.com</span>
        </div>
      </div>
    </div>
  );
}
