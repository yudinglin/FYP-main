// frontend/src/pages/Business/PredictiveAnalysis.jsx
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
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
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
  PlayCircle,
  MessageSquare,
  Heart,
} from "lucide-react";

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

const API_BASE = "http://localhost:5000";

const VIEWS = {
  OVERVIEW: "overview",
  GROWTH: "growth",
  COMPARISON: "comparison",
  ENGAGEMENT: "engagement",
};

export default function PredictiveAnalysis() {
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

  // Initialize with all competitors selected
  useEffect(() => {
    if (competitorChannels.length > 0) {
      setSelectedCompetitors(competitorChannels.map((c) => c.url));
    }
  }, [competitorChannels]);

  // Auto-analyze when page loads if we have a primary channel
  useEffect(() => {
    if (primaryChannel && !analysisData && !loading) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryChannel?.url]);

  const handleAnalyze = async () => {
    if (!primaryChannel) {
      setError("Please set up your primary YouTube channel first in your Business Profile.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisData(null);

    try {
      // Use default values for backend calculations (they won't be shown to user)
      const params = new URLSearchParams({
        primary_url: primaryChannel.url,
        campaign_budget: "1000", // Default, not shown to user
        product_price: "50", // Default, not shown to user
        max_videos: "25",
      });

      if (selectedCompetitors.length > 0) {
        params.append("competitor_urls", selectedCompetitors.join(","));
      }

      const res = await fetch(`${API_BASE}/api/youtube/business.analysis?${params}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to analyze channels");
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
            
            // Calculate 3, 6, and 12 month predictions
            const future3 = lastPoint.x + 3;
            const future6 = lastPoint.x + 6;
            const future12 = lastPoint.x + 12;
            
            const predicted3Months = Math.round(m * future3 + b);
            const predicted6Months = Math.round(m * future6 + b);
            const predicted12Months = Math.round(m * future12 + b);
            
            // Calculate growth metrics
            const avgGrowthPerMonth = m;
            const totalGrowth6Months = predicted6Months - currentSubscribers;
            const growthRate = currentSubscribers > 0 ? (totalGrowth6Months / currentSubscribers) * 100 : 0;

            return {
              url,
              currentSubscribers,
              predicted3Months,
              predicted6Months,
              predicted12Months,
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

  const MenuItem = ({ icon: Icon, label, view }) => (
    <button
      onClick={() => setSelectedView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        selectedView === view
          ? "bg-indigo-50 text-indigo-700 font-medium border-2 border-indigo-200"
          : "text-slate-600 hover:bg-slate-50 border-2 border-transparent"
      }`}
    >
      <Icon size={20} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Channel Growth & Performance
          </h1>
          <p className="text-slate-600">
            See what's working, understand your audience, and plan your next moves
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex flex-col gap-4">
            {/* Navigation */}
            {analysisData && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                <h2 className="text-xs font-bold text-slate-600 px-4 py-2 mb-1 uppercase tracking-wide">
                  Analysis
                </h2>
                <div className="space-y-1">
                  <MenuItem icon={BarChart3} label="Overview" view={VIEWS.OVERVIEW} />
                  <MenuItem icon={TrendingUp} label="Growth Plan" view={VIEWS.GROWTH} />
                  <MenuItem icon={Users} label="Competition" view={VIEWS.COMPARISON} />
                  <MenuItem icon={ThumbsUp} label="Engagement" view={VIEWS.ENGAGEMENT} />
                </div>
              </div>
            )}

            {/* Channel Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Your Channels
              </h3>

              <div className="space-y-4">
                {/* Your Channel */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">Primary Channel</label>
                  {primaryChannel ? (
                    <div className="p-3 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-indigo-600" />
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
                {competitorChannels.length > 0 && (
                  <div>
                    <label className="text-sm text-slate-600 block mb-2">Compare With</label>
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
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <span className="text-sm text-slate-700">{ch.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !primaryChannel}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing..." : analysisData ? "Refresh Analysis" : "Analyze Now"}
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
                <div className="text-sm font-medium mb-3">Quick Stats</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Subscribers</span>
                    <span className="font-semibold">
                      {formatNumber(analysisData.primary_channel.subscribers)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Avg Views/Video</span>
                    <span className="font-semibold">
                      {formatNumber(analysisData.primary_channel.avg_views_per_video)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Engagement</span>
                    <span className="font-semibold">
                      {(analysisData.primary_channel.engagement_rate * 100).toFixed(2)}%
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
              <EmptyState primaryChannel={primaryChannel} onAnalyze={handleAnalyze} loading={loading} />
            ) : (
              <>
                {selectedView === VIEWS.OVERVIEW && <OverviewView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.GROWTH && (
                  <GrowthView 
                    predictions={subscriberPredictions} 
                    loading={predictionsLoading}
                    primaryChannel={primaryChannel}
                    competitorChannels={competitorChannels}
                  />
                )}
                {selectedView === VIEWS.COMPARISON && <ComparisonView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.ENGAGEMENT && <EngagementView data={analysisData} primaryName={primaryChannel?.name} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ primaryChannel, onAnalyze, loading }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
      <div className="flex items-center justify-center h-72">
        <div className="text-center text-slate-600">
          <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">Ready to Analyze?</div>
          {primaryChannel ? (
            <>
              <div className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                Click "Analyze Now" to see insights about your channel: <strong>{primaryChannel.name}</strong>
              </div>
              <button
                onClick={onAnalyze}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Analyze Now"}
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-500 max-w-md mx-auto">
              Please set up your primary YouTube channel in your Business Profile first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview View
function OverviewView({ data, primaryName }) {
  const primary = data.primary_channel;
  const hasCompetitors = data.competitors && data.competitors.length > 0;

  // Calculate key business metrics
  const videosAnalyzed = primary.total_videos || 0;
  const monthlyGrowth = primary.avg_views_per_video > 0 ? ((primary.growth_momentum.score / 100) * primary.subscribers * 0.05) : 0;
  const potentialReach = (primary.subscribers * (primary.engagement_rate * 100)).toFixed(0);

  return (
    <div className="space-y-6">
    {/* Executive Summary - 3 Key Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="rounded-2xl bg-white border-2 border-indigo-200 shadow-sm p-6">
        <div className="text-sm font-medium text-indigo-600 mb-2">Total Subscribers</div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(primary.subscribers)}</div>
        <div className="text-xs text-slate-600">Your audience size</div>
        </div>

        <div className="rounded-2xl bg-white border-2 border-indigo-200 shadow-sm p-6">
        <div className="text-sm font-medium text-indigo-600 mb-2">Avg Views per Video</div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(primary.avg_views_per_video)}</div>
        <div className="text-xs text-slate-600">Content reach</div>
        </div>

        <div className="rounded-2xl bg-white border-2 border-indigo-200 shadow-sm p-6">
        <div className="text-sm font-medium text-indigo-600 mb-2">Engagement Rate</div>
        <div className="text-3xl font-bold text-slate-900 mb-1">
            {(primary.engagement_rate * 100).toFixed(1)}%
        </div>
        <div className="text-xs text-slate-600">Audience interaction</div>
        </div>

    </div>
      {/* Growth Status */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={24} />
          Your Channel Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Growth Momentum</span>
              {primary.growth_momentum.trend === "growing" && <span className="text-2xl">📈</span>}
              {primary.growth_momentum.trend === "declining" && <span className="text-2xl">📉</span>}
              {primary.growth_momentum.trend === "stable" && <span className="text-2xl">➡️</span>}
            </div>
            <p className="text-xs text-slate-600 mb-3">
              {primary.growth_momentum.trend === "growing" 
                ? "Your recent videos are outperforming older content - momentum is positive!"
                : primary.growth_momentum.trend === "declining"
                ? "Recent content underperforming - review what made your top videos successful"
                : "Consistent performance - room for growth with strategic changes"}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Quality Score</span>
              <span className="text-2xl font-bold text-amber-600">{primary.audience_quality}/100</span>
            </div>
            <p className="text-xs text-slate-600">
              {primary.audience_quality >= 70 
                ? "✓ Strong! Your audience actively engages"
                : primary.audience_quality >= 40
                ? "~ Moderate - good foundation to build on"
                : "! Needs improvement - focus on engagement"}
            </p>
          </div>
        </div>
      </div>

      {/* Key Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            What You Should Do
          </h3>
          <div className="space-y-3">
            {data.recommendations.slice(0, 3).map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Competitive Position - Simplified */}
      {hasCompetitors && data.competitive_analysis && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">How You Compare</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RankCard
              title="Growth"
              rank={data.competitive_analysis.rankings.growth}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Audience"
              rank={data.competitive_analysis.rankings.audience_quality}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Engagement"
              rank={data.competitive_analysis.rankings.audience_quality}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Consistency"
              rank={data.competitive_analysis.rankings.growth}
              total={data.competitive_analysis.rankings.total_channels}
            />
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {data.competitive_analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.competitive_analysis.strengths.length > 0 && (
            <div className="p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-slate-600" size={20} />
                <h4 className="font-bold text-slate-800 text-sm">Your Strengths</h4>
              </div>
              <ul className="space-y-2">
                {data.competitive_analysis.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-slate-700">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {data.competitive_analysis.weaknesses.length > 0 && (
            <div className="p-5 bg-slate-100 rounded-lg border-2 border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-slate-600" size={20} />
                <h4 className="font-bold text-slate-800 text-sm">Focus Areas</h4>
              </div>
              <ul className="space-y-2">
                {data.competitive_analysis.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-xs text-slate-700">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Growth Predictions View - Simplified for Business Users
function GrowthView({ predictions, loading, primaryChannel, competitorChannels }) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <div className="text-slate-600">Building your growth forecast...</div>
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
            <div className="text-sm text-slate-500">Click "Analyze Now" to generate growth forecast</div>
          </div>
        </div>
      </div>
    );
  }

  const primaryPrediction = predictions.find(p => p.url === primaryChannel?.url);
  const competitorPredictions = predictions.filter(p => p.url !== primaryChannel?.url && !p.error);

  const getChannelName = (url) => {
    if (url === primaryChannel?.url) return primaryChannel?.name || "Your Channel";
    const comp = competitorChannels.find(c => c.url === url);
    return comp?.name || "Competitor";
  };

  const validPredictions = predictions.filter(p => !p.error);

  return (
    <div className="space-y-6">
      {/* Your Forecast - Large Card */}
      {primaryPrediction && !primaryPrediction.error && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-sm p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">{primaryChannel?.name || "Your Channel"} - 6 Month Forecast</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl p-5 bg-white/15 backdrop-blur">
              <div className="text-sm font-medium text-white/90 mb-2">Today</div>
              <div className="text-3xl font-bold mb-1">{formatNumber(primaryPrediction.currentSubscribers)}</div>
              <div className="text-xs text-white/80">Current subscribers</div>
            </div>
            
            <div className="rounded-xl p-5 bg-white/25 border-2 border-white/40 backdrop-blur">
              <div className="text-sm font-medium text-white/90 mb-2">In 6 Months</div>
              <div className="text-3xl font-bold mb-1">{formatNumber(primaryPrediction.predicted6Months)}</div>
              <div className="text-xs text-white/80">
                +{formatNumber(primaryPrediction.totalGrowth6Months)} subscribers
              </div>
            </div>
            
            <div className="rounded-xl p-5 bg-indigo-400/20 border-2 border-white/40 backdrop-blur">
              <div className="text-sm font-medium text-white/90 mb-2">Growth Rate</div>
              <div className="text-3xl font-bold mb-1">{primaryPrediction.growthRate.toFixed(1)}%</div>
              <div className="text-xs text-white/80">Expected growth</div>
            </div>
          </div>

          {/* Mini Chart */}
          {primaryPrediction.history && primaryPrediction.history.length > 0 && (
            <div className="mt-4 p-4 bg-white/10 rounded-xl backdrop-blur">
              <div className="text-xs font-semibold text-white/90 mb-3">12-Month Trend</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={primaryPrediction.history.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                      }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => formatNumber(value)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="subscribers" 
                      stroke="#ffffff" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Growth Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={20} />
            What This Means
          </h3>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Monthly Growth:</strong> +{formatNumber(primaryPrediction.avgGrowthPerMonth)} subscribers/month
            </p>
            <p>
              <strong>6-Month Target:</strong> Reach {formatNumber(primaryPrediction.predicted6Months)} subscribers
            </p>
            <p className="text-xs text-slate-500">
              Based on your current content performance and engagement patterns
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Zap className="text-amber-500" size={20} />
            To Hit This Target
          </h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">✓</span>
              <span>Maintain upload consistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">✓</span>
              <span>Increase engagement (replies to comments)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">✓</span>
              <span>Optimize thumbnails & titles</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Comparison */}
      {validPredictions.length > 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">How Your Growth Compares</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={validPredictions.map(p => ({
                  name: getChannelName(p.url),
                  current: p.currentSubscribers,
                  predicted: p.predicted6Months,
                  isPrimary: p.url === primaryChannel?.url,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value.toString();
                  }}
                  style={{ fontSize: '12px' }}
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
                <Bar dataKey="current" name="Current" radius={[8, 8, 0, 0]}>
                  {validPredictions.map((_, index) => (
                    <Cell key={`cell-current-${index}`} fill={validPredictions[index].url === primaryChannel?.url ? "#4f46e5" : "#cbd5e1"} />
                  ))}
                </Bar>
                <Bar dataKey="predicted" name="6-Month Forecast" radius={[8, 8, 0, 0]}>
                  {validPredictions.map((_, index) => (
                    <Cell key={`cell-predicted-${index}`} fill={validPredictions[index].url === primaryChannel?.url ? "#6366f1" : "#e0e7ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// Comparison View - Simplified
function ComparisonView({ data, primaryName }) {
  const primary = data.primary_channel;
  const competitors = data.competitors;

  if (!competitors || competitors.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center text-slate-600">
            <Users className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Channels Selected</h3>
            <p className="text-slate-600">Select channels to compare from the sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competition Overview */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Competitive Landscape</h2>

        {/* Your Channel Highlight */}
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{primaryName || "Your Channel"}</h3>
              <p className="text-sm text-slate-600 mt-1">{formatNumber(primary.subscribers)} subscribers</p>
            </div>
            <div className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">You</div>
          </div>
        </div>

        {/* Competitor Cards */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-3 uppercase tracking-wide text-slate-600">Competitors</h3>
          <div className="space-y-3">
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

      {/* Metrics Comparison */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Metrics</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: primaryName || "You", ...primary, isPrimary: true },
                ...competitors.map(c => ({ name: c.channel_name, ...c, isPrimary: false }))
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
              <YAxis domain={[0, 100]} style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="audience_quality" name="Audience Quality" radius={[8, 8, 0, 0]}>
                {[
                  { isPrimary: true },
                  ...competitors.map(() => ({ isPrimary: false }))
                ].map((entry, index) => (
                  <Cell key={`cell-quality-${index}`} fill={entry.isPrimary ? "#4f46e5" : "#cbd5e1"} />
                ))}
              </Bar>
              <Bar dataKey="consistency_score" name="Consistency" radius={[8, 8, 0, 0]}>
                {[
                  { isPrimary: true },
                  ...competitors.map(() => ({ isPrimary: false }))
                ].map((entry, index) => (
                  <Cell key={`cell-consistency-${index}`} fill={entry.isPrimary ? "#6366f1" : "#e0e7ff"} />
                ))}
              </Bar>
              <Bar dataKey="growth_momentum.score" name="Growth Score" radius={[8, 8, 0, 0]}>
                {[
                  { isPrimary: true },
                  ...competitors.map(() => ({ isPrimary: false }))
                ].map((entry, index) => (
                  <Cell key={`cell-growth-${index}`} fill={entry.isPrimary ? "#f59e0b" : "#fde68a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
          <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-slate-600" />
            Your Advantages
          </h4>
          <ul className="space-y-2 text-sm text-slate-700">
            {data.competitive_analysis?.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-slate-600 mt-0.5 flex-shrink-0">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 bg-slate-100 rounded-lg border-2 border-slate-300">
          <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-slate-600" />
            Areas to Improve
          </h4>
          <ul className="space-y-2 text-sm text-slate-700">
            {data.competitive_analysis?.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-slate-600 mt-0.5 flex-shrink-0">!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Engagement View - Simplified
function EngagementView({ data, primaryName }) {
  const primary = data.primary_channel;
  const allChannels = [
    { name: primaryName || "You", ...primary, isPrimary: true },
    ...data.competitors.map(c => ({ ...c, isPrimary: false }))
  ];

  const engagementLevel = primary.audience_quality >= 70 ? "Excellent" : primary.audience_quality >= 40 ? "Good" : "Needs Work";

  return (
    <div className="space-y-6">
      {/* Your Engagement - Large Summary */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Audience Engagement</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
            <div className="text-xs font-semibold text-slate-600 mb-2">ENGAGEMENT LEVEL</div>
            <div className="text-3xl font-bold text-slate-900 mb-2">{engagementLevel}</div>
            <div className="text-sm text-slate-600">Quality Score: {primary.audience_quality}/100</div>
          </div>

          <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
            <div className="text-xs font-semibold text-slate-600 mb-2">ENGAGEMENT RATE</div>
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {(primary.engagement_rate * 100).toFixed(2)}%
            </div>
            <div className="text-sm text-slate-600">Likes + Comments per 100 views</div>
          </div>

          <div className="p-5 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl border-2 border-slate-300">
            <div className="text-xs font-semibold text-slate-600 mb-2">AVG VIEWS/VIDEO</div>
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {formatNumber(primary.avg_views_per_video)}
            </div>
            <div className="text-sm text-slate-600">Content reach</div>
          </div>
        </div>

        {/* Engagement Insight */}
        <div className="p-5 bg-indigo-50 rounded-xl border-2 border-indigo-200">
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Info size={20} className="text-indigo-600" />
            What This Means
          </h3>
          <p className="text-sm text-slate-700 mb-3">
            {primary.audience_quality >= 70
              ? "✓ You have a highly engaged audience! They actively interact with your content through likes and comments. This is a strong indicator of a healthy community. Keep creating quality content that encourages interaction."
              : primary.audience_quality >= 40
              ? "~ Your audience is moderately engaged. Focus on encouraging more interaction by asking questions, responding to all comments, and creating content that promotes sharing. Even small improvements can grow your reach."
              : "! Your audience engagement needs improvement. Start by responding quickly to comments, asking questions in your videos, and creating content that naturally encourages likes/shares. Engagement is key to growth."}
          </p>
        </div>
      </div>

      {/* Comparison with Competitors */}
      {data.competitors.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">How You Compare</h3>
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
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
                <YAxis domain={[0, 100]} style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quality" name="Audience Quality Score" radius={[8, 8, 0, 0]}>
                  {allChannels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isPrimary ? "#6366f1" : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Engagement Tips */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="text-indigo-600" size={20} />
          Boost Engagement
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="font-bold text-sm text-amber-900 mb-2">Quick Wins</h4>
            <ul className="space-y-2 text-xs text-amber-800">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Respond to every comment in first hour</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Ask questions that require answers</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Pin your best comment or question</span>
              </li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-sm text-blue-900 mb-2">Content Ideas</h4>
            <ul className="space-y-2 text-xs text-blue-800">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Create polls & surveys in cards</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>End videos with clear calls-to-action</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Feature audience comments</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="rounded-xl p-4 bg-white/15">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} className="text-white/90" />
        <span className="text-sm text-white/90 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/80">{subtitle}</div>
    </div>
  );
}

function GrowthBadge({ trend }) {
  const badges = {
    growing: { icon: TrendingUp, text: "Growing", color: "bg-indigo-600", textColor: "text-white" },
    declining: { icon: TrendingDown, text: "Declining", color: "bg-red-500", textColor: "text-white" },
    stable: { icon: Activity, text: "Stable", color: "bg-blue-500", textColor: "text-white" },
  };

  const badge = badges[trend] || badges.stable;
  const Icon = badge.icon;

  return (
    <div className={`${badge.color} ${badge.textColor} px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold`}>
      <Icon size={16} />
      {badge.text}
    </div>
  );
}

function RecommendationCard({ recommendation }) {
  const colors = {
    success: { bg: "from-slate-50 to-slate-100", border: "border-slate-300", icon: "bg-indigo-600" },
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

function ChannelComparisonCard({ channel, channelName, isPrimary, primary }) {
  const engagementDiff = primary ? ((channel.engagement_rate - primary.engagement_rate) / primary.engagement_rate * 100) : 0;
  const qualityDiff = primary ? (channel.audience_quality - primary.audience_quality) : 0;

  return (
    <div className={`p-5 rounded-xl border-2 ${isPrimary ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-300' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{channelName}</h4>
          <p className="text-sm text-slate-600">{formatNumber(channel.subscribers)} subscribers</p>
        </div>
        {!isPrimary && (
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${qualityDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {qualityDiff > 0 ? 'Ahead' : 'Behind'} You
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Avg Views</p>
          <p className="text-sm font-bold text-slate-900">{formatNumber(channel.avg_views_per_video)}</p>
        </div>

        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Engagement</p>
          <p className="text-sm font-bold text-slate-900">{(channel.engagement_rate * 100).toFixed(2)}%</p>
          {!isPrimary && engagementDiff !== 0 && (
            <p className={`text-xs font-semibold mt-1 ${engagementDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {engagementDiff >= 0 ? '+' : ''}{engagementDiff.toFixed(1)}%
            </p>
          )}
        </div>

        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Audience Quality</p>
          <p className="text-sm font-bold text-slate-900">{channel.audience_quality}/100</p>
          {!isPrimary && qualityDiff !== 0 && (
            <p className={`text-xs font-semibold mt-1 ${qualityDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {qualityDiff >= 0 ? '+' : ''}{qualityDiff}
            </p>
          )}
        </div>

        <div className={`p-3 rounded-lg ${isPrimary ? 'bg-white' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-600 mb-1">Growth</p>
          <p className="text-sm font-bold text-slate-900">{channel.growth_momentum.score}/100</p>
          <p className="text-xs text-slate-500 mt-1">{channel.growth_momentum.trend}</p>
        </div>
      </div>
    </div>
  );
}