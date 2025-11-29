import React from "react";

export default function AboutUs() {
  return (
    <div className="pt-28 px-6 pb-20 max-w-5xl mx-auto bg-white-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-12">About Us</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-2">See the network. Decode the impact.</h2>
        <p className="text-gray-700">
          YouAnalyze is a platform built to empower content creators and business users with clear, actionable insights from their social media performance. We believe that anyone—from small businesses to aspiring creators—should have access to simple, meaningful analytics that help them grow their online presence.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Our Mission</h3>
        <p className="text-gray-700">
          To make social-media's data easy to understand through simple, powerful, AI-driven analysis.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">What We Do</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Identify target user-groups and engagement patterns</li>
          <li>Visualize social networks in real time</li>
          <li>Provide clear insights for smarter decisions</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Why We Exist</h3>
        <p className="text-gray-700">
          Social platforms grow every second, generating complex webs of interactions. But complexity shouldn’t mean confusion.
          <br />
          YouAnalyze was created to decode the digital world, giving users the clarity they need to act confidently—whether it’s for research, content strategy, community building, or understanding social impact.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Our Vision</h3>
        <p className="text-gray-700">
          A future where digital networks are transparent, intelligent, and easy for everyone to decode.
        </p>
      </section>
    </div>
  );
}