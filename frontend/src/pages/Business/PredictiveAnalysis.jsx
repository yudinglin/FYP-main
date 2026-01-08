// frontend/src/pages/Business/PredictiveAnalysisBusiness.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  Users,
  Eye,
  HelpCircle,
  Lightbulb,
  PlayCircle,
  Award,
  ArrowRight,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Star,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:5000";

export default function PredictiveAnalysisBusiness() {
  const { user } = useAuth();

  const channels = useMemo(() => {
    const list = Array.isArray(user?.youtube_channels) ? user.youtube_channels : [];
    return list
      .map((c) => ({
        url: (c?.url || "").trim(),
        name: (c?.name || "").trim(),
        is_primary: Boolean(c?.is_primary),
      }))
      .filter((c) => c.url);
  }, [user]);

  const primaryChannel = useMemo(() => {
    return channels.find((c) => c.is_primary) || channels[0] || null;
  }, [channels]);

  const influencerChannels = useMemo(() => {
    return channels.filter((c) => !c.is_primary);
  }, [channels]);

  // State
  const [selectedInfluencers, setSelectedInfluencers] = useState([]);
  const [maxVideos, setMaxVideos] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [predictionData, setPredictionData] = useState(null);
  const [showHelp, setShowHelp] = useState(true);

  // Simple campaign settings - user friendly defaults
  const [campaignBudget, setCampaignBudget] = useState(1000);
  const [productPrice, setProductPrice] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings (hidden by default)
  const [ctr, setCtr] = useState(2.0);
  const [conversionRate, setConversionRate] = useState(5.0);

  // Initialize with all influencers selected
  useEffect(() => {
    if (influencerChannels.length > 0) {
      setSelectedInfluencers(influencerChannels.map((c) => c.url));
    }
  }, [influencerChannels]);

  const handleAnalyze = async () => {
    if (!primaryChannel) {
      setError("Please set up your YouTube channel first in Business Profile.");
      return;
    }

    if (selectedInfluencers.length === 0) {
      setError("Please select at least one competitor to compare with.");
      return;
    }

    setLoading(true);
    setError("");
    setPredictionData(null);

    try {
      const params = new URLSearchParams({
        primary_url: primaryChannel.url,
        influencer_urls: selectedInfluencers.join(","),
        maxVideos: maxVideos.toString(),
        cost_per_influencer: campaignBudget.toString(),
        ctr: (ctr / 100).toString(),
        conversion_rate: (conversionRate / 100).toString(),
        avg_order_value: productPrice.toString(),
      });

      const res = await fetch(`${API_BASE}/api/youtube/campaigns.predictiveAnalysis?${params}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to analyze. Please try again.");
      }

      const data = await res.json();
      data.influencer_predictions = data.influencer_predictions.map((inf) => ({
        ...inf,
        channel_name: influencerChannels.find((c) => c.url === inf.channel_url)?.name || "Competitor",
      }));
      setPredictionData(data);
      setShowHelp(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleInfluencer = (url) => {
    setSelectedInfluencers((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const formatMoney = (n) => `$${(Number(n) || 0).toLocaleString()}`;
  const formatNumber = (n) => (Number(n) || 0).toLocaleString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Simple Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            📊 How Does Your Channel Compare?
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Compare your YouTube channel with competitors and discover how much money you could make from marketing campaigns
          </p>
        </div>

        {/* Help Banner */}
        {showHelp && !predictionData && (
          <div className="mb-6 bg-blue-100 border-2 border-blue-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg flex-shrink-0">
                <HelpCircle className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-2">How This Works (3 Simple Steps)</h3>
                <div className="space-y-3 text-blue-800">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">1</span>
                    <p className="text-sm">
                      <strong>Select competitors</strong> - Choose which YouTube channels you want to compare against (your competitors or similar channels)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">2</span>
                    <p className="text-sm">
                      <strong>Set your budget</strong> - Tell us how much you'd spend on a marketing campaign and what you sell
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">3</span>
                    <p className="text-sm">
                      <strong>Get insights</strong> - We'll show you how your channel performs vs competitors and how much money you could make
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="mt-4 text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  Got it, hide this →
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Simple Setup */}
          <div className="lg:col-span-1 space-y-4">
            {/* Step 1: Your Channel */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
                <h3 className="text-base font-bold text-slate-900">Your Channel</h3>
              </div>
              
              {primaryChannel ? (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-blue-600" size={20} />
                    <p className="text-sm font-bold text-slate-900">{primaryChannel.name || "Your Channel"}</p>
                  </div>
                  <p className="text-xs text-slate-600">This is the channel we'll analyze</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-300">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-amber-600" size={20} />
                    <p className="text-sm font-bold text-slate-900">No channel set</p>
                  </div>
                  <p className="text-xs text-slate-600">Please add your YouTube channel in Business Profile first</p>
                </div>
              )}
            </div>

            {/* Step 2: Select Competitors */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">2</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">Select Competitors</h3>
                  <p className="text-xs text-slate-500">Who do you want to compare with?</p>
                </div>
              </div>
              
              {influencerChannels.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">No competitor channels added yet</p>
                  <p className="text-xs text-slate-500">Add competitor YouTube channels in Business Profile to compare</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {influencerChannels.map((ch) => (
                    <label
                      key={ch.url}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 cursor-pointer border-2 border-transparent hover:border-blue-200 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInfluencers.includes(ch.url)}
                        onChange={() => toggleInfluencer(ch.url)}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 flex-1">{ch.name || "Competitor"}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Campaign Settings */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">Campaign Details</h3>
                  <p className="text-xs text-slate-500">Tell us about your marketing</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <DollarSign size={16} className="text-blue-600" />
                    Marketing Budget per Campaign
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={campaignBudget}
                    onChange={(e) => setCampaignBudget(Math.max(100, parseInt(e.target.value) || 1000))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-base font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">How much you'd spend on one marketing campaign</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Target size={16} className="text-blue-600" />
                    Your Product/Service Price
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={productPrice}
                    onChange={(e) => setProductPrice(Math.max(1, parseInt(e.target.value) || 50))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-base font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">Average price of what you sell</p>
                </div>

                {/* Advanced Settings Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-left flex items-center gap-1"
                >
                  {showAdvanced ? '▼' : '▶'} Advanced Settings (optional)
                </button>

                {showAdvanced && (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                        Expected Click Rate (%)
                        <HelpCircle size={12} className="text-slate-400" title="How many viewers will click your ad" />
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="20"
                        step="0.5"
                        value={ctr}
                        onChange={(e) => setCtr(Math.max(0.1, Math.min(20, parseFloat(e.target.value) || 2)))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                        Expected Purchase Rate (%)
                        <HelpCircle size={12} className="text-slate-400" title="How many clickers will buy" />
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="50"
                        step="0.5"
                        value={conversionRate}
                        onChange={(e) => setConversionRate(Math.max(0.1, Math.min(50, parseFloat(e.target.value) || 5)))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !primaryChannel || selectedInfluencers.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-lg disabled:opacity-60 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                "Analyzing..."
              ) : (
                <>
                  <PlayCircle size={24} />
                  Compare & Analyze
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Main Results Panel */}
          <div className="lg:col-span-3">
            {!predictionData ? (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="text-blue-600" size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to Compare?</h3>
                  <p className="text-slate-600 mb-6">
                    Fill in the details on the left and click "Compare & Analyze" to see how your channel stacks up against competitors
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <ArrowRight size={20} />
                    <span>Start by selecting competitors</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Comparison Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Your Performance Report</h2>
                      <p className="text-blue-100 text-lg">
                        {primaryChannel?.name || "Your Channel"} • {formatNumber(predictionData.primary_channel.subscribers)} subscribers
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                      {predictionData.primary_channel.growth_analysis.direction === "growing" ? (
                        <>
                          <TrendingUp size={20} />
                          <span className="font-semibold">Growing</span>
                        </>
                      ) : predictionData.primary_channel.growth_analysis.direction === "declining" ? (
                        <>
                          <TrendingDown size={20} />
                          <span className="font-semibold">Declining</span>
                        </>
                      ) : (
                        <>
                          <Minus size={20} />
                          <span className="font-semibold">Stable</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SimpleMetricCard
                      icon={Eye}
                      label="People You'll Reach"
                      value={formatNumber(predictionData.primary_channel.reach_prediction.predicted_reach)}
                      subtitle="viewers per campaign"
                    />
                    <SimpleMetricCard
                      icon={DollarSign}
                      label="Expected Revenue"
                      value={formatMoney(predictionData.primary_channel.roi_prediction.revenue)}
                      subtitle={`from ${predictionData.primary_channel.roi_prediction.conversions.toFixed(0)} sales`}
                      highlight
                    />
                    <SimpleMetricCard
                      icon={Target}
                      label="Return on Investment"
                      value={`${predictionData.primary_channel.roi_prediction.roi_percentage.toFixed(0)}%`}
                      subtitle={predictionData.primary_channel.roi_prediction.roi_percentage >= 50 ? "Great ROI!" : "Could be better"}
                    />
                  </div>
                </div>

                {/* Simple Ranking Cards */}
                {predictionData.competitive_insights && predictionData.competitive_insights.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Lightbulb className="text-green-600" size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">How You Compare</h2>
                        <p className="text-slate-600">See where you stand against competitors</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {predictionData.competitive_insights.map((insight, idx) => (
                        <SimpleInsightCard key={idx} insight={insight} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranking Visualization */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Ranking</h2>
                  <p className="text-slate-600 mb-6">See how you rank against competitors</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SimpleRankingCard
                      title="💰 Money Earned"
                      data={[
                        {
                          name: primaryChannel?.name || "You",
                          value: predictionData.primary_channel.roi_prediction.revenue,
                          isPrimary: true,
                        },
                        ...predictionData.influencer_predictions.map((inf) => ({
                          name: inf.channel_name,
                          value: inf.roi_prediction.revenue,
                          isPrimary: false,
                        })),
                      ].sort((a, b) => b.value - a.value)}
                      formatter={formatMoney}
                    />

                    <SimpleRankingCard
                      title="👥 People Reached"
                      data={[
                        {
                          name: primaryChannel?.name || "You",
                          value: predictionData.primary_channel.reach_prediction.predicted_reach,
                          isPrimary: true,
                        },
                        ...predictionData.influencer_predictions.map((inf) => ({
                          name: inf.channel_name,
                          value: inf.reach_prediction.predicted_reach,
                          isPrimary: false,
                        })),
                      ].sort((a, b) => b.value - a.value)}
                      formatter={formatNumber}
                    />

                    <SimpleRankingCard
                      title="📈 Return on Investment"
                      data={[
                        {
                          name: primaryChannel?.name || "You",
                          value: predictionData.primary_channel.roi_prediction.roi_percentage,
                          isPrimary: true,
                        },
                        ...predictionData.influencer_predictions.map((inf) => ({
                          name: inf.channel_name,
                          value: inf.roi_prediction.roi_percentage,
                          isPrimary: false,
                        })),
                      ].sort((a, b) => b.value - a.value)}
                      formatter={(v) => `${v.toFixed(0)}%`}
                    />
                  </div>
                </div>

                {/* Should You Collaborate? */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <OptionCard
                    title="Running Campaigns Alone"
                    subtitle="Using only your channel"
                    icon={Target}
                    color="green"
                    metrics={[
                      { label: "People Reached", value: formatNumber(predictionData.primary_channel.reach_prediction.predicted_reach) },
                      { label: "Money Made", value: formatMoney(predictionData.primary_channel.roi_prediction.revenue) },
                      { label: "Cost", value: formatMoney(campaignBudget) },
                      { label: "Profit", value: formatMoney(predictionData.primary_channel.roi_prediction.revenue - campaignBudget) },
                    ]}
                  />

                  <OptionCard
                    title="Working with Influencers"
                    subtitle={`${predictionData.combined_campaign.num_influencers} influencer partnerships`}
                    icon={Users}
                    color="blue"
                    metrics={[
                      { 
                        label: "People Reached", 
                        value: formatNumber(predictionData.combined_campaign.total_reach),
                        change: `${((predictionData.combined_campaign.total_reach / predictionData.primary_channel.reach_prediction.predicted_reach - 1) * 100).toFixed(0)}% more`
                      },
                      { 
                        label: "Money Made", 
                        value: formatMoney(predictionData.combined_campaign.roi_prediction.revenue),
                        change: `${((predictionData.combined_campaign.roi_prediction.revenue / predictionData.primary_channel.roi_prediction.revenue - 1) * 100).toFixed(0)}% more`
                      },
                      { label: "Cost", value: formatMoney(predictionData.combined_campaign.total_cost) },
                      { label: "Profit", value: formatMoney(predictionData.combined_campaign.roi_prediction.revenue - predictionData.combined_campaign.total_cost) },
                    ]}
                    recommended={predictionData.combined_campaign.roi_prediction.roi_percentage > predictionData.primary_channel.roi_prediction.roi_percentage}
                  />
                </div>

                {/* What Should You Do? */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg border-2 border-amber-200 p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-500 rounded-xl">
                      <Zap className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">What Should You Do?</h2>
                      <p className="text-slate-600">Based on your analysis, here's our recommendation</p>
                    </div>
                  </div>

                  {predictionData.combined_campaign.roi_prediction.roi_percentage > predictionData.primary_channel.roi_prediction.roi_percentage ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-100 rounded-xl border-2 border-green-300">
                        <ThumbsUp className="text-green-600 flex-shrink-0" size={32} />
                        <div>
                          <p className="font-bold text-green-900 text-lg mb-1">✅ Partner with Influencers</p>
                          <p className="text-green-800 text-sm">
                            Working with influencers will help you reach {formatNumber(predictionData.combined_campaign.total_reach - predictionData.primary_channel.reach_prediction.predicted_reach)} more people 
                            and make {formatMoney(predictionData.combined_campaign.roi_prediction.revenue - predictionData.primary_channel.roi_prediction.revenue)} more revenue.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200">
                        <p className="font-semibold text-slate-900 mb-2">💡 Next Steps:</p>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Focus on the top-performing influencers shown above</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Reach out to start partnership discussions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Start with a small test campaign before investing fully</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-blue-100 rounded-xl border-2 border-blue-300">
                        <Target className="text-blue-600 flex-shrink-0" size={32} />
                        <div>
                          <p className="font-bold text-blue-900 text-lg mb-1">💪 Focus on Your Own Channel</p>
                          <p className="text-blue-800 text-sm">
                            Your channel performs better solo. You'll get better returns by investing in your own content instead of paying influencers.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200">
                        <p className="font-semibold text-slate-900 mb-2">💡 Next Steps:</p>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Invest in better video production and content quality</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Focus on growing your subscriber base organically</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Use your campaign budget for video ads instead</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Competitor Breakdown */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Competitor Details</h2>
                  <p className="text-slate-600 mb-6">See how each competitor compares to your channel</p>

                  <div className="space-y-4">
                    {predictionData.influencer_predictions.map((inf, idx) => (
                      <SimpleCompetitorCard
                        key={idx}
                        competitor={inf}
                        primaryChannel={predictionData.primary_channel}
                      />
                    ))}
                  </div>
                </div>

                {/* Visual Chart */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Money Comparison Chart</h2>
                  <p className="text-slate-600 mb-6">Visual comparison of expected revenue from each channel</p>

                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "You",
                            revenue: predictionData.primary_channel.roi_prediction.revenue,
                            isPrimary: true,
                          },
                          ...predictionData.influencer_predictions.map((inf) => ({
                            name: inf.channel_name,
                            revenue: inf.roi_prediction.revenue,
                            isPrimary: false,
                          })),
                        ]}
                        margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          angle={-15} 
                          textAnchor="end" 
                          height={80} 
                          tick={{ fontSize: 14, fill: "#475569" }} 
                        />
                        <YAxis 
                          tick={{ fontSize: 14, fill: "#475569" }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value) => [formatMoney(value), "Expected Revenue"]}
                          contentStyle={{ borderRadius: '12px', border: '2px solid #e2e8f0' }}
                        />
                        <Bar dataKey="revenue" name="Revenue" radius={[12, 12, 0, 0]}>
                          {[predictionData.primary_channel, ...predictionData.influencer_predictions].map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? "#10b981" : "#6366f1"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm text-slate-500 mt-4">
                    Green = Your channel | Purple = Competitors
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified Components

function SimpleMetricCard({ icon: Icon, label, value, subtitle, highlight }) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? "bg-white/25 border-2 border-white/40" : "bg-white/15"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={22} className="text-white/90" />
        <span className="text-sm text-white/90 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/80">{subtitle}</div>
    </div>
  );
}

function SimpleInsightCard({ insight }) {
  const icons = {
    success: CheckCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: { 
      bg: "from-green-50 to-green-100", 
      border: "border-green-300", 
      text: "text-green-900",
      icon: "text-green-600",
      badge: "bg-green-500"
    },
    warning: { 
      bg: "from-amber-50 to-amber-100", 
      border: "border-amber-300", 
      text: "text-amber-900",
      icon: "text-amber-600",
      badge: "bg-amber-500"
    },
    info: { 
      bg: "from-blue-50 to-blue-100", 
      border: "border-blue-300", 
      text: "text-blue-900",
      icon: "text-blue-600",
      badge: "bg-blue-500"
    },
  };

  const Icon = icons[insight.type] || Info;
  const colorScheme = colors[insight.type] || colors.info;

  return (
    <div className={`bg-gradient-to-br ${colorScheme.bg} border-2 ${colorScheme.border} rounded-xl p-5`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 ${colorScheme.badge} rounded-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${colorScheme.text} text-lg mb-1`}>{insight.title}</h3>
          <p className={`${colorScheme.text} text-sm opacity-90`}>{insight.message}</p>
        </div>
      </div>
      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
        <p className="text-xs font-bold text-slate-600 mb-1">💡 What to do:</p>
        <p className="text-sm text-slate-800">{insight.action}</p>
      </div>
    </div>
  );
}

function SimpleRankingCard({ title, data, formatter }) {
  return (
    <div className="bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
      <h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {data.slice(0, 5).map((item, idx) => {
          const yourRank = data.findIndex(d => d.isPrimary) + 1;
          const isYou = item.isPrimary;
          
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isYou 
                  ? "bg-green-100 border-2 border-green-400 shadow-md" 
                  : "bg-white border border-slate-200"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                idx === 0 ? "bg-yellow-400 text-yellow-900" : 
                idx === 1 ? "bg-gray-300 text-gray-700" :
                idx === 2 ? "bg-orange-400 text-orange-900" :
                "bg-slate-200 text-slate-600"
              }`}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
              </div>
              <span className={`flex-1 font-semibold ${isYou ? "text-green-900" : "text-slate-700"}`}>
                {isYou ? "🎯 You" : item.name}
              </span>
              <span className={`font-bold ${isYou ? "text-green-700" : "text-slate-900"}`}>
                {formatter(item.value)}
              </span>
            </div>
          );
        })}
      </div>
      
      {data.length > 5 && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          +{data.length - 5} more channels
        </p>
      )}
    </div>
  );
}

function OptionCard({ title, subtitle, icon: Icon, color, metrics, recommended }) {
  const colors = {
    green: {
      gradient: "from-green-50 to-green-100",
      border: "border-green-300",
      icon: "bg-green-500",
      text: "text-green-900"
    },
    blue: {
      gradient: "from-blue-50 to-blue-100",
      border: "border-blue-300",
      icon: "bg-blue-500",
      text: "text-blue-900"
    }
  };

  const colorScheme = colors[color] || colors.blue;

  return (
    <div className={`bg-gradient-to-br ${colorScheme.gradient} border-2 ${colorScheme.border} rounded-xl p-6 relative`}>
      {recommended && (
        <div className="absolute -top-3 right-4 bg-amber-400 text-amber-900 px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
          <Star size={14} fill="currentColor" />
          RECOMMENDED
        </div>
      )}
      
      <div className="flex items-start gap-3 mb-5">
        <div className={`p-3 ${colorScheme.icon} rounded-xl`}>
          <Icon className="text-white" size={28} />
        </div>
        <div>
          <h3 className={`text-xl font-bold ${colorScheme.text} mb-1`}>{title}</h3>
          <p className={`text-sm ${colorScheme.text} opacity-80`}>{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-sm font-medium text-slate-600">{metric.label}</span>
            <div className="text-right">
              <span className="text-base font-bold text-slate-900 block">{metric.value}</span>
              {metric.change && (
                <span className="text-xs text-green-600 font-semibold">{metric.change}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleCompetitorCard({ competitor, primaryChannel }) {
  const reachDiff = ((competitor.reach_prediction.predicted_reach / primaryChannel.reach_prediction.predicted_reach - 1) * 100);
  const revenueDiff = ((competitor.roi_prediction.revenue / primaryChannel.roi_prediction.revenue - 1) * 100);

  const isPerformingBetter = revenueDiff > 0;

  return (
    <div className={`border-2 rounded-xl p-5 ${isPerformingBetter ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{competitor.channel_name}</h3>
          <p className="text-sm text-slate-600">
            {formatNumber(competitor.channel_stats.subscribers)} subscribers
          </p>
        </div>
        {isPerformingBetter ? (
          <div className="flex items-center gap-2 bg-red-200 text-red-900 px-3 py-1 rounded-full text-sm font-bold">
            <TrendingUp size={16} />
            Ahead of You
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-bold">
            <TrendingDown size={16} />
            Behind You
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-600 mb-1">Will Reach</p>
          <p className="text-base font-bold text-slate-900">{formatNumber(competitor.reach_prediction.predicted_reach)} people</p>
          <p className={`text-xs font-semibold mt-1 ${reachDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {reachDiff >= 0 ? '+' : ''}{reachDiff.toFixed(0)}% vs you
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-600 mb-1">Will Make</p>
          <p className="text-base font-bold text-slate-900">{formatMoney(competitor.roi_prediction.revenue)}</p>
          <p className={`text-xs font-semibold mt-1 ${revenueDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {revenueDiff >= 0 ? '+' : ''}{revenueDiff.toFixed(0)}% vs you
          </p>
        </div>
      </div>

      <div className="p-3 bg-white rounded-lg border border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-1">Why?</p>
        <p className="text-sm text-slate-700">
          {isPerformingBetter 
            ? `This competitor has ${reachDiff > 0 ? 'better reach' : 'higher engagement'} which helps them make more money per campaign.`
            : `You're performing better! Your channel has ${Math.abs(reachDiff) > 10 ? 'better reach' : 'higher engagement'}.`
          }
        </p>
      </div>
    </div>
  );
}

function formatMoney(n) {
  return `${(Number(n) || 0).toLocaleString()}`;
}

function formatNumber(n) {
  return (Number(n) || 0).toLocaleString();
}