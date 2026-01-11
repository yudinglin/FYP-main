// frontend/src/pages/Business/PredictiveAnalysisBusiness.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  Users,
  Eye,
  BarChart3,
  Award,
  Zap,
  Star,
  ThumbsUp,
  Activity,
  TrendingUpIcon,
  PlayCircle,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:5000";

const VIEWS = {
  OVERVIEW: "overview",
  ROI: "roi",
  COMPARISON: "comparison",
  GROWTH: "growth",
  AUDIENCE: "audience",
  SUBSCRIBERS: "subscribers",
};

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

  const competitorChannels = useMemo(() => {
    return channels.filter((c) => !c.is_primary);
  }, [channels]);

  // State
  const [selectedView, setSelectedView] = useState(VIEWS.OVERVIEW);
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [subscriberPredictions, setSubscriberPredictions] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // Settings
  const [campaignBudget, setCampaignBudget] = useState(1000);
  const [productPrice, setProductPrice] = useState(50);

  // Initialize with all competitors selected
  useEffect(() => {
    if (competitorChannels.length > 0) {
      setSelectedCompetitors(competitorChannels.map((c) => c.url));
    }
  }, [competitorChannels]);

  const handleAnalyze = async () => {
    if (!primaryChannel) {
      setError("Please set up your YouTube channel first in Business Profile.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisData(null);

    try {
      const params = new URLSearchParams({
        primary_url: primaryChannel.url,
        campaign_budget: campaignBudget.toString(),
        product_price: productPrice.toString(),
        max_videos: "25",
      });

      if (selectedCompetitors.length > 0) {
        params.append("competitor_urls", selectedCompetitors.join(","));
      }

      const res = await fetch(`${API_BASE}/api/youtube/business.analysis?${params}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to analyze");
      }

      const data = await res.json();
      
      // Add names to competitors
      data.competitors = data.competitors.map((comp) => ({
        ...comp,
        channel_name: competitorChannels.find((c) => c.url === comp.channel_url)?.name || "Competitor",
      }));
      
      setAnalysisData(data);
      
      // Fetch subscriber predictions for all channels
      fetchSubscriberPredictions([primaryChannel.url, ...selectedCompetitors]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriberPredictions = async (channelUrls) => {
    setPredictionsLoading(true);
    
    try {
      const predictions = await Promise.all(
        channelUrls.map(async (url) => {
          try {
            const q = encodeURIComponent(url);
            
            // Get current subscriber count
            const r1 = await fetch(`${API_BASE}/api/youtube/channels.list?url=${q}`);
            if (!r1.ok) throw new Error("Failed to fetch channel data");
            const channelData = await r1.json();
            const currentSubscribers = channelData.subscriberCount ?? 0;

            // Get video data
            const r2 = await fetch(
              `${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
            );
            if (!r2.ok) throw new Error("Failed to fetch video data");
            const videoData = await r2.json();
            const rawMetrics = videoData.rawMetrics ?? videoData.nodes ?? [];
            
            if (rawMetrics.length === 0) {
              return { url, error: "No video data available" };
            }

            // Generate subscriber history
            const videosWithDates = rawMetrics
              .filter(v => v.publishedAt)
              .map(v => ({
                ...v,
                publishedAt: new Date(v.publishedAt),
                engagement: (v.views > 0) ? ((v.likes || 0) + (v.comments || 0)) / v.views : 0,
              }))
              .sort((a, b) => a.publishedAt - b.publishedAt);

            if (videosWithDates.length === 0) {
              return { url, error: "No videos with publish dates" };
            }

            const history = [];
            const firstDate = new Date(videosWithDates[0].publishedAt);
            firstDate.setDate(1);
            const lastDate = new Date();
            
            const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                              (lastDate.getMonth() - firstDate.getMonth());
            
            const startSubscribers = Math.max(10, Math.floor(currentSubscribers * 0.15));
            const totalGrowth = currentSubscribers - startSubscribers;
            
            let currentDate = new Date(firstDate);
            let monthIndex = 0;
            
            while (currentDate <= lastDate) {
              const videosUpToDate = videosWithDates.filter(v => v.publishedAt <= currentDate);
              
              if (videosUpToDate.length > 0) {
                const avgEngagement = videosWithDates
                  .filter(v => v.publishedAt <= currentDate)
                  .reduce((sum, v) => sum + v.engagement, 0) / videosUpToDate.length;
                
                const totalViews = videosUpToDate.reduce((sum, v) => sum + (v.views || 0), 0);
                const progress = monthIndex / Math.max(1, monthsDiff);
                const engagementBoost = Math.min(avgEngagement * 2, 0.5);
                const viewsBoost = Math.min(totalViews / 5000000, 0.3);
                const growthCurve = Math.pow(progress, 0.7 + engagementBoost + viewsBoost);
                const estimatedSubscribers = Math.floor(
                  startSubscribers + (totalGrowth * growthCurve)
                );
                
                history.push({
                  date: currentDate.toISOString().split("T")[0],
                  subscribers: Math.min(estimatedSubscribers, currentSubscribers),
                });
              } else {
                history.push({
                  date: currentDate.toISOString().split("T")[0],
                  subscribers: startSubscribers,
                });
              }

              currentDate = new Date(currentDate);
              currentDate.setMonth(currentDate.getMonth() + 1);
              monthIndex++;
            }

            if (history.length > 0) {
              history[history.length - 1].subscribers = currentSubscribers;
            }

            // Calculate predictions using linear regression
            const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstHistDate = new Date(sorted[0].date);
            const dataPoints = sorted.map((item) => {
              const date = new Date(item.date);
              const monthsSinceStart = (date - firstHistDate) / (1000 * 60 * 60 * 24 * 30.44);
              return {
                x: monthsSinceStart,
                y: item.subscribers,
              };
            });

            const n = dataPoints.length;
            const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
            const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
            const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
            const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

            const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const b = (sumY - m * sumX) / n;

            const lastPoint = dataPoints[dataPoints.length - 1];
            
            // Calculate 6-month prediction
            const futureX = lastPoint.x + 6;
            const predicted6Months = Math.round(m * futureX + b);
            
            // Calculate growth metrics
            const avgGrowthPerMonth = m;
            const totalGrowth6Months = predicted6Months - currentSubscribers;
            const growthRate = currentSubscribers > 0 ? (totalGrowth6Months / currentSubscribers) * 100 : 0;

            return {
              url,
              currentSubscribers,
              predicted6Months,
              avgGrowthPerMonth: Math.round(avgGrowthPerMonth),
              totalGrowth6Months,
              growthRate,
              history,
            };
          } catch (err) {
            console.error(`Error fetching predictions for ${url}:`, err);
            return { url, error: err.message };
          }
        })
      );

      setSubscriberPredictions(predictions);
    } catch (err) {
      console.error("Error fetching subscriber predictions:", err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const toggleCompetitor = (url) => {
    setSelectedCompetitors((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const MenuItem = ({ icon: Icon, label, view, badge }) => (
    <button
      onClick={() => setSelectedView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        selectedView === view
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={20} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Channel Performance Dashboard
          </h1>
          <p className="text-slate-600">
            Understand your channel's performance and compare with competitors
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            {/* Navigation */}
            {analysisData && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
                <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">
                  Views
                </h2>
                <div className="space-y-1">
                  <MenuItem icon={BarChart3} label="Overview" view={VIEWS.OVERVIEW} badge="Default" />
                  <MenuItem icon={DollarSign} label="Money & ROI" view={VIEWS.ROI} />
                  <MenuItem icon={Users} label="Compare Channels" view={VIEWS.COMPARISON} />
                  <MenuItem icon={TrendingUp} label="Growth Trends" view={VIEWS.GROWTH} />
                  <MenuItem icon={Eye} label="Audience Quality" view={VIEWS.AUDIENCE} />
                  <MenuItem icon={Activity} label="Subscriber Predictions" view={VIEWS.SUBSCRIBERS} />
                </div>
              </div>
            )}

            {/* Analysis Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Analysis Settings
              </h3>

              <div className="space-y-4">
                {/* Your Channel */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">Your Channel</label>
                  {primaryChannel ? (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-slate-900">{primaryChannel.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-sm text-amber-700">No channel set</span>
                    </div>
                  )}
                </div>

                {/* Competitors */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">Compare With</label>
                  {competitorChannels.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm text-slate-600">No competitors added</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {competitorChannels.map((ch) => (
                        <label
                          key={ch.url}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCompetitors.includes(ch.url)}
                            onChange={() => toggleCompetitor(ch.url)}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span className="text-sm text-slate-700">{ch.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">
                    Marketing Budget
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={campaignBudget}
                    onChange={(e) => setCampaignBudget(Math.max(100, parseInt(e.target.value) || 1000))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Per campaign</p>
                </div>

                {/* Product Price */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">
                    Product Price
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={productPrice}
                    onChange={(e) => setProductPrice(Math.max(1, parseInt(e.target.value) || 50))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">What you sell</p>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !primaryChannel}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing..." : "Analyze Now"}
                </button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {analysisData && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-sm p-4 text-white">
                <div className="text-sm font-medium mb-3">Channel Overview</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Subscribers</span>
                    <span className="font-semibold">
                      {formatNumber(analysisData.primary_channel.subscribers)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Expected ROI</span>
                    <span className="font-semibold">
                      {analysisData.primary_channel.roi_prediction.roi_percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {error && !analysisData ? (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-rose-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Error</p>
                    <p className="text-sm text-rose-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : !analysisData ? (
              <EmptyState />
            ) : (
              <>
                {selectedView === VIEWS.OVERVIEW && <OverviewView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.ROI && <ROIView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.COMPARISON && <ComparisonView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.GROWTH && <GrowthView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.AUDIENCE && <AudienceView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.SUBSCRIBERS && (
                  <SubscriberPredictionsView 
                    predictions={subscriberPredictions} 
                    loading={predictionsLoading}
                    primaryChannel={primaryChannel}
                    competitorChannels={competitorChannels}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriberPredictionsView({ predictions, loading, primaryChannel, competitorChannels }) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <div className="text-slate-600">Analyzing subscriber growth predictions...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center text-slate-600">
            <Activity className="mx-auto text-slate-300 mb-4" size={64} />
            <div className="font-medium text-slate-900 text-xl mb-2">No Prediction Data</div>
            <div className="text-sm text-slate-500">Click "Analyze Now" to generate subscriber predictions</div>
          </div>
        </div>
      </div>
    );
  }

  // Find primary channel prediction
  const primaryPrediction = predictions.find(p => p.url === primaryChannel?.url);
  const competitorPredictions = predictions.filter(p => p.url !== primaryChannel?.url && !p.error);

  // Get channel names
  const getChannelName = (url) => {
    if (url === primaryChannel?.url) return primaryChannel?.name || "Your Channel";
    const comp = competitorChannels.find(c => c.url === url);
    return comp?.name || "Competitor";
  };

  // Calculate rankings
  const validPredictions = predictions.filter(p => !p.error);
  const sortedByGrowthRate = [...validPredictions].sort((a, b) => b.growthRate - a.growthRate);
  const sortedBy6MonthSubs = [...validPredictions].sort((a, b) => b.predicted6Months - a.predicted6Months);
  const sortedByMonthlyGrowth = [...validPredictions].sort((a, b) => b.avgGrowthPerMonth - a.avgGrowthPerMonth);

  const primaryRankGrowthRate = sortedByGrowthRate.findIndex(p => p.url === primaryChannel?.url) + 1;
  const primaryRank6Month = sortedBy6MonthSubs.findIndex(p => p.url === primaryChannel?.url) + 1;
  const primaryRankMonthly = sortedByMonthlyGrowth.findIndex(p => p.url === primaryChannel?.url) + 1;

  // Prepare chart data for growth comparison
  const comparisonChartData = validPredictions.map(p => ({
    name: getChannelName(p.url),
    current: p.currentSubscribers,
    predicted: p.predicted6Months,
    isPrimary: p.url === primaryChannel?.url,
  }));

  return (
    <div className="space-y-6">
      {/* Your Prediction Card */}
      {primaryPrediction && !primaryPrediction.error && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-sm p-8 text-white">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{primaryChannel?.name || "Your Channel"}</h2>
              <p className="text-indigo-100 text-lg">Subscriber Growth Forecast</p>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-full">
              <span className="text-sm font-semibold">6-Month Outlook</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4 bg-white/15">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-white/90" />
                <span className="text-sm text-white/90 font-medium">Current</span>
              </div>
              <div className="text-2xl font-bold mb-1">{formatNumber(primaryPrediction.currentSubscribers)}</div>
              <div className="text-sm text-white/80">subscribers</div>
            </div>
            
            <div className="rounded-xl p-4 bg-white/25 border-2 border-white/40">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-white/90" />
                <span className="text-sm text-white/90 font-medium">Projected (6mo)</span>
              </div>
              <div className="text-2xl font-bold mb-1">{formatNumber(primaryPrediction.predicted6Months)}</div>
              <div className="text-sm text-white/80">
                +{formatNumber(primaryPrediction.totalGrowth6Months)} gain
              </div>
            </div>
            
            <div className="rounded-xl p-4 bg-white/15">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={20} className="text-white/90" />
                <span className="text-sm text-white/90 font-medium">Growth Rate</span>
              </div>
              <div className="text-2xl font-bold mb-1">{primaryPrediction.growthRate.toFixed(1)}%</div>
              <div className="text-sm text-white/80">over 6 months</div>
            </div>
            
            <div className="rounded-xl p-4 bg-white/15">
              <div className="flex items-center gap-2 mb-2">
                <Star size={20} className="text-white/90" />
                <span className="text-sm text-white/90 font-medium">Monthly Avg</span>
              </div>
              <div className="text-2xl font-bold mb-1">+{formatNumber(primaryPrediction.avgGrowthPerMonth)}</div>
              <div className="text-sm text-white/80">subscribers/month</div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings */}
      {validPredictions.length > 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Your Competitive Position</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border-2 ${primaryRankGrowthRate === 1 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-xs font-medium text-slate-600 mb-1">Growth Rate Rank</p>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${primaryRankGrowthRate === 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                  #{primaryRankGrowthRate}
                </span>
                <span className="text-lg text-slate-600 mb-1">/ {validPredictions.length}</span>
              </div>
              {primaryRankGrowthRate === 1 && <p className="text-xs text-amber-700 mt-1 font-semibold">🏆 Fastest Growth</p>}
            </div>
            
            <div className={`p-4 rounded-xl border-2 ${primaryRank6Month === 1 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-xs font-medium text-slate-600 mb-1">6-Month Size Rank</p>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${primaryRank6Month === 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                  #{primaryRank6Month}
                </span>
                <span className="text-lg text-slate-600 mb-1">/ {validPredictions.length}</span>
              </div>
              {primaryRank6Month === 1 && <p className="text-xs text-amber-700 mt-1 font-semibold">🏆 Largest Projected</p>}
            </div>
            
            <div className={`p-4 rounded-xl border-2 ${primaryRankMonthly === 1 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-xs font-medium text-slate-600 mb-1">Monthly Velocity Rank</p>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${primaryRankMonthly === 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                  #{primaryRankMonthly}
                </span>
                <span className="text-lg text-slate-600 mb-1">/ {validPredictions.length}</span>
              </div>
              {primaryRankMonthly === 1 && <p className="text-xs text-amber-700 mt-1 font-semibold">🏆 Best Monthly Gain</p>}
            </div>
          </div>
        </div>
      )}

      {/* Growth Comparison Chart */}
      {validPredictions.length > 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Growth Comparison: Current vs 6-Month Projection</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip 
                  formatter={(value) => formatNumber(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="current" name="Current Subscribers" radius={[8, 8, 0, 0]}>
                  {comparisonChartData.map((entry, index) => (
                    <Cell key={`cell-current-${index}`} fill={entry.isPrimary ? "#4f46e5" : "#94a3b8"} />
                  ))}
                </Bar>
                <Bar dataKey="predicted" name="Predicted (6 months)" radius={[8, 8, 0, 0]}>
                  {comparisonChartData.map((entry, index) => (
                    <Cell key={`cell-predicted-${index}`} fill={entry.isPrimary ? "#10b981" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">
            Dark colors = Your channel | Light colors = Competitors
          </p>
        </div>
      )}

      {/* Detailed Comparison Table */}
      {validPredictions.length > 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Detailed Growth Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Channel</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Current</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">6-Month</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Gain</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Growth %</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Monthly Avg</th>
                </tr>
              </thead>
              <tbody>
                {validPredictions.map((pred, idx) => {
                  const isPrimary = pred.url === primaryChannel?.url;
                  return (
                    <tr 
                      key={idx} 
                      className={`border-b border-slate-100 ${isPrimary ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{getChannelName(pred.url)}</span>
                          {isPrimary && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-slate-700 font-medium">
                        {formatNumber(pred.currentSubscribers)}
                      </td>
                      <td className="text-right py-3 px-4 text-slate-900 font-bold">
                        {formatNumber(pred.predicted6Months)}
                      </td>
                      <td className="text-right py-3 px-4 text-green-600 font-bold">
                        +{formatNumber(pred.totalGrowth6Months)}
                      </td>
                      <td className="text-right py-3 px-4 font-bold">
                        <span className={pred.growthRate > 20 ? 'text-green-600' : pred.growthRate > 10 ? 'text-blue-600' : 'text-slate-600'}>
                          {pred.growthRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 text-slate-700 font-medium">
                        +{formatNumber(pred.avgGrowthPerMonth)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      {primaryPrediction && !primaryPrediction.error && validPredictions.length > 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-amber-500" size={20} />
            <h3 className="text-xl font-bold text-slate-900">Growth Insights</h3>
          </div>
          
          <div className="space-y-3">
            {/* Growth Rate Insight */}
            {primaryRankGrowthRate === 1 ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-green-900 mb-1">🎉 Fastest Growth Rate!</h4>
                    <p className="text-sm text-green-800">
                      Your channel is projected to grow at {primaryPrediction.growthRate.toFixed(1)}%, the highest among all channels analyzed. 
                      Keep up your current content strategy!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Growth Rate Opportunity</h4>
                    <p className="text-sm text-blue-800">
                      You're ranked #{primaryRankGrowthRate} in growth rate ({primaryPrediction.growthRate.toFixed(1)}%). 
                      The leader is growing at {sortedByGrowthRate[0].growthRate.toFixed(1)}%. 
                      Analyze their content strategy to accelerate your growth.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Velocity Insight */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-start gap-3">
                <Activity className="text-indigo-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-indigo-900 mb-1">Monthly Growth Velocity</h4>
                  <p className="text-sm text-indigo-800">
                    You're gaining an average of {formatNumber(primaryPrediction.avgGrowthPerMonth)} subscribers per month. 
                    {primaryRankMonthly === 1 
                      ? " This is the highest monthly gain among all channels! 🚀" 
                      : ` To match the top performer, you'd need to gain ${formatNumber(sortedByMonthlyGrowth[0].avgGrowthPerMonth)} per month.`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Time to Milestone */}
            {(() => {
              const milestones = [100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
              const nextMilestone = milestones.find(m => m > primaryPrediction.currentSubscribers);
              
              if (nextMilestone && primaryPrediction.avgGrowthPerMonth > 0) {
                const monthsToMilestone = Math.ceil((nextMilestone - primaryPrediction.currentSubscribers) / primaryPrediction.avgGrowthPerMonth);
                const milestoneLabel = nextMilestone >= 1000000 ? `${nextMilestone / 1000000}M` : `${nextMilestone / 1000}K`;
                
                return (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-3">
                      <Target className="text-purple-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-bold text-purple-900 mb-1">Next Milestone: {milestoneLabel} Subscribers</h4>
                        <p className="text-sm text-purple-800">
                          At your current growth rate, you'll reach {milestoneLabel} subscribers in approximately {monthsToMilestone} months 
                          ({new Date(Date.now() + monthsToMilestone * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}).
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// Components

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
      <div className="flex items-center justify-center h-72">
        <div className="text-center text-slate-600">
          <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">Ready to Analyze?</div>
          <div className="text-sm text-slate-500 max-w-md mx-auto">
            Fill in your campaign details on the left and click "Analyze Now" to see insights about your channel
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewView({ data, primaryName }) {
  const primary = data.primary_channel;
  const hasCompetitors = data.competitors && data.competitors.length > 0;

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm p-8 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">{primaryName || "Your Channel"}</h2>
            <p className="text-blue-100 text-lg">{formatNumber(primary.subscribers)} subscribers</p>
          </div>
          <GrowthBadge trend={primary.growth_momentum.trend} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={Eye}
            label="Campaign Reach"
            value={formatNumber(primary.campaign_reach.predicted_reach)}
            subtitle="people per campaign"
          />
          <MetricCard
            icon={DollarSign}
            label="Expected Profit"
            value={formatMoney(primary.roi_prediction.profit)}
            subtitle={`${primary.roi_prediction.roi_percentage.toFixed(0)}% ROI`}
            highlight
          />
          <MetricCard
            icon={Activity}
            label="Audience Quality"
            value={`${primary.audience_quality}/100`}
            subtitle="engagement score"
          />
          <MetricCard
            icon={Star}
            label="Consistency"
            value={`${primary.consistency_score}/100`}
            subtitle="performance stability"
          />
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="text-amber-500" />
            What You Should Do
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Competitive Position */}
      {hasCompetitors && data.competitive_analysis && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Your Position vs Competitors</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <RankCard
              title="ROI"
              rank={data.competitive_analysis.rankings.roi}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Reach"
              rank={data.competitive_analysis.rankings.reach}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Audience"
              rank={data.competitive_analysis.rankings.audience_quality}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Growth"
              rank={data.competitive_analysis.rankings.growth}
              total={data.competitive_analysis.rankings.total_channels}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.competitive_analysis.strengths.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="text-green-600" size={20} />
                  <h4 className="font-bold text-green-900">Your Strengths</h4>
                </div>
                <ul className="space-y-1">
                  {data.competitive_analysis.strengths.map((s, idx) => (
                    <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.competitive_analysis.weaknesses.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-amber-600" size={20} />
                  <h4 className="font-bold text-amber-900">Areas to Improve</h4>
                </div>
                <ul className="space-y-1">
                  {data.competitive_analysis.weaknesses.map((w, idx) => (
                    <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                      <span className="text-amber-600 mt-0.5">!</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ROIView({ data, primaryName }) {
  const primary = data.primary_channel;
  const allChannels = [
    { name: primaryName || "You", ...primary, isPrimary: true },
    ...data.competitors.map(c => ({ ...c, isPrimary: false }))
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold text-slate-900 mb-6">Return on Investment Analysis</h3>
        
        {/* Your ROI Breakdown */}
        <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Your Campaign Projection</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ROIMetric label="Investment" value={formatMoney(primary.roi_prediction.cost)} />
            <ROIMetric label="Expected Revenue" value={formatMoney(primary.roi_prediction.revenue)} />
            <ROIMetric label="Profit" value={formatMoney(primary.roi_prediction.profit)} highlight />
            <ROIMetric label="ROI" value={`${primary.roi_prediction.roi_percentage.toFixed(0)}%`} highlight />
          </div>
          
          <div className="mt-4 p-4 bg-white rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>What this means:</strong> For every $100 you spend, you'll make about{" "}
              <span className="font-bold text-green-600">
                ${(100 + primary.roi_prediction.roi_percentage).toFixed(0)}
              </span>
              {" "}back. You'll reach <strong>{formatNumber(primary.campaign_reach.predicted_reach)}</strong> people and get approximately{" "}
              <strong>{primary.roi_prediction.sales.toFixed(0)} sales</strong>.
            </p>
          </div>
        </div>

        {/* ROI Comparison Chart */}
        {data.competitors.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-slate-900 mb-4">ROI Comparison</h4>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allChannels.map(c => ({
                    name: c.isPrimary ? "You" : c.channel_name,
                    roi: c.roi_prediction.roi_percentage,
                    profit: c.roi_prediction.profit,
                    isPrimary: c.isPrimary
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis label={{ value: 'ROI %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-lg border-2 border-slate-200 shadow-lg">
                            <p className="font-bold">{payload[0].payload.name}</p>
                            <p className="text-sm">ROI: {payload[0].value.toFixed(1)}%</p>
                            <p className="text-sm">Profit: {formatMoney(payload[0].payload.profit)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="roi" radius={[8, 8, 0, 0]}>
                    {allChannels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPrimary ? "#10b981" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-sm text-slate-500 mt-4">
              Green = Your channel | Purple = Competitors
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonView({ data, primaryName }) {
  const primary = data.primary_channel;
  const competitors = data.competitors;

  if (!competitors || competitors.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center text-slate-600">
            <Users className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Competitors Selected</h3>
            <p className="text-slate-600">Select competitors from the sidebar to see comparisons</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold text-slate-900 mb-6">Channel Comparison</h3>

        {/* Your Channel Card */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Award className="text-blue-600" />
            Your Channel (Baseline)
          </h4>
          <ChannelComparisonCard
            channel={primary}
            channelName={primaryName || "Your Channel"}
            isPrimary
          />
        </div>

        {/* Competitor Cards */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3">Competitors</h4>
          <div className="grid grid-cols-1 gap-4">
            {competitors.map((comp, idx) => (
              <ChannelComparisonCard
                key={idx}
                channel={comp}
                channelName={comp.channel_name}
                primary={primary}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Multi-metric Radar */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Performance Radar</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={[
              {
                metric: 'ROI Score',
                you: Math.min(100, primary.roi_prediction.roi_percentage),
                avgComp: competitors.reduce((sum, c) => sum + Math.min(100, c.roi_prediction.roi_percentage), 0) / competitors.length
              },
              {
                metric: 'Audience Quality',
                you: primary.audience_quality,
                avgComp: competitors.reduce((sum, c) => sum + c.audience_quality, 0) / competitors.length
              },
              {
                metric: 'Growth',
                you: primary.growth_momentum.score,
                avgComp: competitors.reduce((sum, c) => sum + c.growth_momentum.score, 0) / competitors.length
              },
              {
                metric: 'Consistency',
                you: primary.consistency_score,
                avgComp: competitors.reduce((sum, c) => sum + c.consistency_score, 0) / competitors.length
              },
              {
                metric: 'Engagement',
                you: primary.engagement_rate * 10000,
                avgComp: competitors.reduce((sum, c) => sum + c.engagement_rate * 10000, 0) / competitors.length
              },
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="You" dataKey="you" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
              <Radar name="Avg Competitor" dataKey="avgComp" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function GrowthView({ data, primaryName }) {
  const allChannels = [
    { name: primaryName || "You", ...data.primary_channel, isPrimary: true },
    ...data.competitors.map(c => ({ ...c, isPrimary: false }))
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold text-slate-900 mb-6">Growth & Momentum Analysis</h3>

        {/* Your Growth */}
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">Your Channel Growth</h4>
              <p className="text-sm text-slate-600">Based on recent video performance</p>
            </div>
            <GrowthBadge trend={data.primary_channel.growth_momentum.trend} large />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Growth Score</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {data.primary_channel.growth_momentum.score}
                </span>
                <span className="text-lg text-slate-600 mb-1">/100</span>
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Consistency Score</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {data.primary_channel.consistency_score}
                </span>
                <span className="text-lg text-slate-600 mb-1">/100</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>What this means:</strong>{" "}
              {data.primary_channel.growth_momentum.trend === "growing" 
                ? "Your recent videos are performing better than older ones. Keep up the momentum!"
                : data.primary_channel.growth_momentum.trend === "declining"
                ? "Your recent videos are getting fewer views. Time to refresh your content strategy."
                : "Your performance is steady. Consider experimenting to drive growth."}
            </p>
          </div>
        </div>

        {/* Growth Comparison */}
        {data.competitors.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-slate-900 mb-4">Growth Comparison</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allChannels.map(c => ({
                    name: c.isPrimary ? "You" : c.channel_name,
                    score: c.growth_momentum.score,
                    isPrimary: c.isPrimary
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {allChannels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPrimary ? "#10b981" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AudienceView({ data, primaryName }) {
  const allChannels = [
    { name: primaryName || "You", ...data.primary_channel, isPrimary: true },
    ...data.competitors.map(c => ({ ...c, isPrimary: false }))
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold text-slate-900 mb-6">Audience Quality Analysis</h3>

        {/* Your Audience */}
        <div className="mb-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Your Audience Quality</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Quality Score</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {data.primary_channel.audience_quality}
                </span>
                <span className="text-lg text-slate-600 mb-1">/100</span>
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Avg Views per Video</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatNumber(data.primary_channel.avg_views_per_video)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Engagement Rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {(data.primary_channel.engagement_rate * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>What this means:</strong>{" "}
              {data.primary_channel.audience_quality >= 70
                ? "You have a highly engaged audience! They actively interact with your content through likes and comments."
                : data.primary_channel.audience_quality >= 40
                ? "Your audience is moderately engaged. There's room to improve interaction."
                : "Your audience engagement needs work. Focus on creating content that encourages likes, comments, and shares."}
            </p>
          </div>
        </div>

        {/* Quality Comparison */}
        {data.competitors.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-slate-900 mb-4">Audience Quality Comparison</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allChannels.map(c => ({
                    name: c.isPrimary ? "You" : c.channel_name,
                    quality: c.audience_quality,
                    engagement: c.engagement_rate * 10000,
                    isPrimary: c.isPrimary
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="quality" radius={[8, 8, 0, 0]}>
                    {allChannels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPrimary ? "#10b981" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ icon: Icon, label, value, subtitle, highlight }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-white/25 border-2 border-white/40" : "bg-white/15"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} className="text-white/90" />
        <span className="text-sm text-white/90 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/80">{subtitle}</div>
    </div>
  );
}

function GrowthBadge({ trend, large }) {
  const badges = {
    growing: { icon: TrendingUp, text: "Growing", color: "bg-green-500", textColor: "text-white" },
    declining: { icon: TrendingDown, text: "Declining", color: "bg-red-500", textColor: "text-white" },
    stable: { icon: TrendingUpIcon, text: "Stable", color: "bg-blue-500", textColor: "text-white" },
  };

  const badge = badges[trend] || badges.stable;
  const Icon = badge.icon;

  return (
    <div className={`${badge.color} ${badge.textColor} px-4 py-2 rounded-full flex items-center gap-2 ${large ? 'text-base' : 'text-sm'} font-semibold`}>
      <Icon size={large ? 20 : 16} />
      {badge.text}
    </div>
  );
}

function RecommendationCard({ recommendation }) {
  const colors = {
    success: { bg: "from-green-50 to-green-100", border: "border-green-300", icon: "bg-green-500" },
    warning: { bg: "from-amber-50 to-amber-100", border: "border-amber-300", icon: "bg-amber-500" },
    info: { bg: "from-blue-50 to-blue-100", border: "border-blue-300", icon: "bg-blue-500" },
  };

  const color = colors[recommendation.type] || colors.info;
  const Icon = recommendation.type === "success" ? CheckCircle : recommendation.type === "warning" ? AlertCircle : Info;

  return (
    <div className={`bg-gradient-to-br ${color.bg} border-2 ${color.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 ${color.icon} rounded-lg flex-shrink-0`}>
          <Icon className="text-white" size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-1">{recommendation.title}</h4>
          <p className="text-sm text-slate-700 mb-2">{recommendation.message}</p>
          <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-1">💡 Action:</p>
            <p className="text-sm text-slate-800">{recommendation.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankCard({ title, rank, total }) {
  const isTop = rank === 1;
  const isGood = rank <= total / 2;

  return (
    <div className={`p-4 rounded-xl border-2 ${isTop ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' : isGood ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-600 mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${isTop ? 'text-amber-600' : isGood ? 'text-green-600' : 'text-slate-700'}`}>
          #{rank}
        </span>
        <span className="text-lg text-slate-600 mb-1">/ {total}</span>
      </div>
      {isTop && <p className="text-xs text-amber-700 mt-1 font-semibold">🏆 Top Performer</p>}
    </div>
  );
}

function ROIMetric({ label, value, highlight }) {
  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-green-100 border-2 border-green-300' : 'bg-white border border-slate-200'}`}>
      <p className={`text-sm mb-1 ${highlight ? 'text-green-700 font-semibold' : 'text-slate-600'}`}>{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-green-900' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function ChannelComparisonCard({ channel, channelName, isPrimary, primary }) {
  const reachDiff = primary ? ((channel.campaign_reach.predicted_reach / primary.campaign_reach.predicted_reach - 1) * 100) : 0;
  const roiDiff = primary ? ((channel.roi_prediction.roi_percentage / primary.roi_prediction.roi_percentage - 1) * 100) : 0;

  return (
    <div className={`p-5 rounded-xl border-2 ${isPrimary ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{channelName}</h4>
          <p className="text-sm text-slate-600">{formatNumber(channel.subscribers)} subscribers</p>
        </div>
        {!isPrimary && (
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${roiDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {roiDiff > 0 ? 'Ahead' : 'Behind'} You
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Campaign Reach</p>
          <p className="text-sm font-bold text-slate-900">{formatNumber(channel.campaign_reach.predicted_reach)}</p>
          {!isPrimary && (
            <p className={`text-xs font-semibold mt-1 ${reachDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {reachDiff >= 0 ? '+' : ''}{reachDiff.toFixed(0)}%
            </p>
          )}
        </div>

        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Expected ROI</p>
          <p className="text-sm font-bold text-slate-900">{channel.roi_prediction.roi_percentage.toFixed(0)}%</p>
          {!isPrimary && (
            <p className={`text-xs font-semibold mt-1 ${roiDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {roiDiff >= 0 ? '+' : ''}{roiDiff.toFixed(0)}%
            </p>
          )}
        </div>

        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Audience Quality</p>
          <p className="text-sm font-bold text-slate-900">{channel.audience_quality}/100</p>
        </div>

        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Growth Score</p>
          <p className="text-sm font-bold text-slate-900">{channel.growth_momentum.score}/100</p>
        </div>
      </div>
    </div>
  );
}

// Utility Functions

function formatNumber(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function formatMoney(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return `${num.toLocaleString()}`;
}