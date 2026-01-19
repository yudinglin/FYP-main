import React from "react";
import { 
  Target, 
  BarChart3, 
  Eye, 
  Lightbulb,
  Globe,
  Mail,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function AboutUs() {
  const features = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Identify Patterns",
      description: "Discover target user-groups and engagement patterns"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Real-time Visualization",
      description: "Visualize social networks and trends as they happen"
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Clear Insights",
      description: "Get actionable insights for smarter decisions"
    }
  ];

  return (
    <div className="pt-20 px-4 sm:px-6 pb-24 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Hero section */}
        <section className="text-center space-y-8 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-full border border-red-100 mb-4">
            <Sparkles className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">About YouAnalyze</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            Decoding the{" "}
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              Digital World
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Empowering creators and businesses with clear, actionable insights from social media performance. 
            We believe everyone deserves access to meaningful analytics that drive real growth.
          </p>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white p-8 rounded-2xl border border-gray-200 hover:border-red-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <div className="text-red-600">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission & Vision Side-by-side */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Mission */}
            <div className="bg-gradient-to-br from-red-50 to-white p-10 rounded-3xl border border-red-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">
                To demystify social media data through simple, powerful, AI-driven analysis that anyone can understand and use.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-10 rounded-3xl border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">
                A future where digital networks are transparent, intelligent, and accessible for everyone to decode and leverage.
              </p>
            </div>
          </div>
        </section>

        {/* Why We Exist */}
        <section className="mb-20 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-12 text-white">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-6">Why We Exist</h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Social platforms grow every second, generating complex webs of interactions. 
              But complexity shouldn't mean confusion.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              YouAnalyze was created to decode the digital world, giving users the clarity they need 
              to act confidently—whether it's for research, content strategy, community building, 
              or understanding social impact.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-white to-red-50 rounded-3xl p-12 border border-red-100">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">
                Ready to decode your social media?
              </h2>
              <p className="text-gray-600 text-lg">
                Get in touch with our team to learn how YouAnalyze can transform your social media strategy.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-gray-200">
                <Mail className="w-5 h-5 text-red-600" />
                <span className="text-gray-900 font-medium">support@youanalyze.com</span>
              </div>
              
              <a
                href="/contact-support"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 group"
              >
                Contact Support
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}