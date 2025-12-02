import React from "react";

export default function AboutUs() {
  return (
    <div className="pt-28 px-6 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero section */}
        <section className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold text-gray-900">
            About Us
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            YouAnalyze is a platform built to empower content creators and business users with clear, actionable insights from their social media performance. We believe that anyone—from small businesses to aspiring creators—should have access to simple, meaningful analytics that help them grow their online presence.
          </p>
        </section>

        {/* Our Mission */}
        <section className="bg-white p-8 rounded-2xl shadow-md space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
          <p className="text-gray-700">
            To make social-media's data easy to understand through simple, powerful, AI-driven analysis.
          </p>
        </section>

        {/* What We Do */}
        <section className="bg-white p-8 rounded-2xl shadow-md space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">What We Do</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Identify target user-groups and engagement patterns</li>
            <li>Visualize social networks in real time</li>
            <li>Provide clear insights for smarter decisions</li>
          </ul>
        </section>

        {/* Why We Exist */}
        <section className="bg-white p-8 rounded-2xl shadow-md space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Why We Exist</h2>
          <p className="text-gray-700 leading-relaxed">
            Social platforms grow every second, generating complex webs of interactions. But complexity shouldn’t mean confusion.
            <br />
            YouAnalyze was created to decode the digital world, giving users the clarity they need to act confidently—whether it’s for research, content strategy, community building, or understanding social impact.
          </p>
        </section>

        {/* Our Vision */}
        <section className="bg-white p-8 rounded-2xl shadow-md space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
          <p className="text-gray-700">
            A future where digital networks are transparent, intelligent, and easy for everyone to decode.
          </p>
        </section>

        {/* Call-to-action */}
        <section className="text-center space-y-4">
          <p className="text-gray-700 text-lg">
            Want to get in touch? Reach out at{" "}
            <span className="font-medium">support@youanalyze.com</span>
          </p>
          <a
            href="/contact-support"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Contact Support
          </a>
        </section>
      </div>
    </div>
  );
}
