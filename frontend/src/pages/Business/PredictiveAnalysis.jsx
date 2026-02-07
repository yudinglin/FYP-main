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
  Area,
  AreaChart,
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
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Lightbulb,
  HelpCircle,
  Image as ImageIcon,
  Upload,
  X,
  FileImage,
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

// Helper function to get user-friendly quality description
function getQualityDescription(score) {
  if (score >= 80) {
    return {
      label: "Excellent",
      description: "Your audience loves your content and actively participates",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    };
  } else if (score >= 60) {
    return {
      label: "Very Good",
      description: "Strong audience interest with good interaction rates",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    };
  } else if (score >= 40) {
    return {
      label: "Good",
      description: "Healthy audience base with room to increase engagement",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    };
  } else if (score >= 20) {
    return {
      label: "Fair",
      description: "Building momentum - focus on increasing viewer interaction",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    };
  } else {
    return {
      label: "Needs Work",
      description: "Opportunity to grow by encouraging more audience participation",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    };
  }
}

// Helper to get simple engagement level
function getEngagementLevel(rate) {
  const percentage = rate * 100;
  if (percentage >= 5) {
    return { label: "Excellent", color: "text-emerald-600" };
  } else if (percentage >= 3) {
    return { label: "Very Good", color: "text-green-600" };
  } else if (percentage >= 1.5) {
    return { label: "Good", color: "text-blue-600" };
  } else if (percentage >= 0.5) {
    return { label: "Fair", color: "text-orange-600" };
  } else {
    return { label: "Needs Improvement", color: "text-slate-600" };
  }
}

const API_BASE = "http://localhost:5000";

const VIEWS = {
  FORECAST: "forecast",
  COMPARISON: "comparison",
  ENGAGEMENT: "engagement",
  THUMBNAIL: "thumbnail",
};

// View descriptions for user guidance
const VIEW_DESCRIPTIONS = {
  forecast: "See how many subscribers you'll gain in the next 3, 6, and 12 months based on your current performance",
  comparison: "Find out when you'll catch up to competitors and discover who's growing faster",
  engagement: "Learn if your audience engagement is improving and get tips to boost interaction",
  thumbnail: "Upload and test multiple thumbnail options to see which one will get more clicks"
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
  const [selectedView, setSelectedView] = useState(VIEWS.FORECAST);
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisData, setAnalysisData] = useState(null);

  // Thumbnail states
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbnailPreviews, setThumbnailPreviews] = useState([]);
  const [thumbnailData, setThumbnailData] = useState(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState("");

  // Initialize with all competitors selected
  useEffect(() => {
    if (competitorChannels.length > 0) {
      setSelectedCompetitors(competitorChannels.map((c) => c.url));
    }
  }, [competitorChannels]);

  // Auto-analyze when page loads if we have a primary channel
  useEffect(() => {
    if (primaryChannel && !analysisData && !loading && selectedView !== VIEWS.THUMBNAIL) {
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
      const params = new URLSearchParams({
        primary_url: primaryChannel.url,
        max_videos: "50",
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
      data.competitors = data.competitors.map((comp, idx) => ({
        ...comp,
        channel_name: competitorChannels.find((c) => c.url === comp.channel_url)?.name || `Competitor ${idx + 1}`,
      }));
      
      // Add names to growth comparisons
      if (data.growth_comparisons) {
        data.growth_comparisons = data.growth_comparisons.map((gc, idx) => ({
          ...gc,
          competitor_name: competitorChannels[idx]?.name || gc.competitor_name,
        }));
      }
      
      setAnalysisData(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCompetitor = (url) => {
    setSelectedCompetitors((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  // Thumbnail upload handling
  const handleThumbnailUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + thumbnails.length > 4) {
      setThumbnailError("Maximum 4 thumbnails allowed");
      return;
    }

    const newPreviews = [];
    const newThumbnails = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newPreviews.push(event.target.result);
        newThumbnails.push(event.target.result);
        
        if (newPreviews.length === files.length) {
          setThumbnailPreviews([...thumbnailPreviews, ...newPreviews]);
          setThumbnails([...thumbnails, ...newThumbnails]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeThumbnail = (index) => {
    setThumbnails(thumbnails.filter((_, i) => i !== index));
    setThumbnailPreviews(thumbnailPreviews.filter((_, i) => i !== index));
  };

  const handleThumbnailAnalysis = async () => {
    if (thumbnails.length === 0) {
      setThumbnailError("Please upload at least one thumbnail");
      return;
    }

    setThumbnailLoading(true);
    setThumbnailError("");

    try {
      const res = await fetch(`${API_BASE}/api/youtube/analyzer.thumbnailAnalyzer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnails }),
      });

      if (!res.ok) throw new Error(await res.text());
      setThumbnailData(await res.json());
    } catch (err) {
      console.error(err);
      setThumbnailError(err?.message || "Failed to analyze thumbnails");
    } finally {
      setThumbnailLoading(false);
    }
  };

  const MenuItem = ({ icon: Icon, label, view, description }) => (
    <button
      onClick={() => setSelectedView(view)}
      className={`w-full flex flex-col gap-2 px-4 py-3 rounded-lg transition-all text-left ${
        selectedView === view
          ? "bg-indigo-50 text-indigo-700 font-medium border-2 border-indigo-200"
          : "text-slate-600 hover:bg-slate-50 border-2 border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="flex-1">{label}</span>
      </div>
      {selectedView === view && (
        <p className="text-xs text-slate-600 leading-relaxed pl-8">
          {description}
        </p>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Growth Forecast & Analysis
          </h1>
          <p className="text-slate-600">
            See where your channel is heading and how to accelerate growth
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
              <h2 className="text-xs font-bold text-slate-600 px-4 py-2 mb-1 uppercase tracking-wide">
                Analysis Tools
              </h2>
              <div className="space-y-1">
                <MenuItem 
                  icon={Sparkles} 
                  label="Growth Forecast" 
                  view={VIEWS.FORECAST}
                  description={VIEW_DESCRIPTIONS.forecast}
                />
                <MenuItem 
                  icon={Users} 
                  label="Competitor Timeline" 
                  view={VIEWS.COMPARISON}
                  description={VIEW_DESCRIPTIONS.comparison}
                />
                <MenuItem 
                  icon={TrendingUp} 
                  label="Engagement Trends" 
                  view={VIEWS.ENGAGEMENT}
                  description={VIEW_DESCRIPTIONS.engagement}
                />
                <MenuItem 
                  icon={ImageIcon} 
                  label="Thumbnail Tester" 
                  view={VIEWS.THUMBNAIL}
                  description={VIEW_DESCRIPTIONS.thumbnail}
                />
              </div>
            </div>

            {/* Channel Selection - Only show for non-thumbnail views */}
            {selectedView !== VIEWS.THUMBNAIL && (
              <>
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
                  <div className="bg-indigo-600 rounded-xl shadow-sm p-4 text-white">
                    <div className="text-sm font-medium mb-3">Current Stats</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-200 text-sm">Subscribers</span>
                        <span className="font-semibold">
                          {formatNumber(analysisData.primary_channel.subscribers)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-200 text-sm">Growth Rate</span>
                        <span className="font-semibold">
                          {analysisData.primary_channel.subscriber_predictions.monthly_growth_rate}%/mo
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-200 text-sm">6M Target</span>
                        <span className="font-semibold">
                          {formatNumber(analysisData.primary_channel.subscriber_predictions.predicted_6_months)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Thumbnail Tester Sidebar */}
            {selectedView === VIEWS.THUMBNAIL && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Thumbnail Testing
                </h3>
                <div className="text-sm text-slate-600">
                  Upload 1-4 thumbnail options to compare their predicted performance.
                </div>

                {thumbnailError && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {thumbnailError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedView === VIEWS.THUMBNAIL ? (
              <ThumbnailTesterView
                thumbnails={thumbnails}
                thumbnailPreviews={thumbnailPreviews}
                thumbnailData={thumbnailData}
                loading={thumbnailLoading}
                onUpload={handleThumbnailUpload}
                onRemove={removeThumbnail}
                onAnalyze={handleThumbnailAnalysis}
              />
            ) : error && !analysisData ? (
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
                {selectedView === VIEWS.FORECAST && (
                  <GrowthForecastView data={analysisData} primaryName={primaryChannel?.name} />
                )}
                {selectedView === VIEWS.COMPARISON && (
                  <CompetitiveTimelineView data={analysisData} primaryName={primaryChannel?.name} />
                )}
                {selectedView === VIEWS.ENGAGEMENT && (
                  <EngagementPredictionView data={analysisData} primaryName={primaryChannel?.name} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== THUMBNAIL TESTER VIEW ====================
function ThumbnailTesterView({ thumbnails, thumbnailPreviews, thumbnailData, loading, onUpload, onRemove, onAnalyze }) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="text-indigo-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-900">Upload Thumbnail Options</h2>
        </div>

        <div className="mb-4">
          <label className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors bg-slate-50">
              <FileImage className="mx-auto text-slate-400 mb-3" size={48} />
              <p className="text-sm font-medium text-slate-700 mb-1">
                Click to upload thumbnails
              </p>
              <p className="text-xs text-slate-500">
                Upload 1-4 options (JPG, PNG) • Max 5MB each
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Thumbnail Previews */}
        {thumbnailPreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {thumbnailPreviews.map((preview, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={preview}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                />
                <button
                  onClick={() => onRemove(idx)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded font-semibold">
                  Option #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {thumbnails.length > 0 && (
          <button
            onClick={onAnalyze}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60"
          >
            {loading ? "Analyzing..." : `Analyze ${thumbnails.length} Thumbnail${thumbnails.length > 1 ? 's' : ''}`}
          </button>
        )}
      </section>

      {/* Results */}
      {thumbnailData && (
        <>
          {/* Winner Announcement */}
          <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-400 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Award className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">🏆 Winner</h2>
                <p className="text-green-800 font-medium">{thumbnailData.recommendation}</p>
              </div>
            </div>
          </section>

          {/* Detailed Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {thumbnailData.results?.map((result, idx) => (
              <ThumbnailResultCard
                key={idx}
                result={result}
                preview={thumbnailPreviews[result.thumbnail_id - 1]}
                isWinner={result.thumbnail_id === thumbnailData.winner}
              />
            ))}
          </div>
        </>
      )}

      {!thumbnailData && thumbnails.length === 0 && !loading && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
          <div className="text-center max-w-2xl mx-auto">
            <ImageIcon className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Thumbnail Performance Tester</h3>
            <p className="text-slate-600 mb-6">Upload multiple thumbnail options and see which one will get more clicks.</p>

            <div className="text-left space-y-3">
              {[
                "AI-powered click-through rate predictions",
                "Analyzes faces, colors, and text readability",
                "Compare up to 4 options side-by-side",
                "Get specific tips to improve each design"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="text-indigo-600" size={16} />
                  </div>
                  <p className="text-sm text-slate-700">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThumbnailResultCard({ result, preview, isWinner }) {
  if (result.error) {
    return (
      <div className="bg-red-50 rounded-xl border-2 border-red-300 p-5">
        <p className="text-red-800 font-medium mb-2">Error analyzing this thumbnail</p>
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border-2 shadow-sm p-5 ${
      isWinner ? "border-green-500" : "border-slate-200"
    }`}>
      {isWinner && (
        <div className="mb-3">
          <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <Award size={12} /> Best Option
          </span>
        </div>
      )}

      <img
        src={preview}
        alt={`Thumbnail ${result.thumbnail_id}`}
        className="w-full h-40 object-cover rounded-lg mb-4 border border-slate-200"
      />

      <div className="space-y-4">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Score</span>
            <span className="text-2xl font-bold text-indigo-600">{result.overall_score}/100</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${result.overall_score}%` }}
            />
          </div>
        </div>

        {/* CTR Prediction */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-700 mb-1">Predicted Click Rate</p>
          <p className="text-xl font-bold text-green-900">{result.ctr_prediction}</p>
        </div>

        {/* Individual Scores */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 uppercase">Breakdown</p>
          <ScoreBar label="Face Detection" score={result.scores.face_presence} />
          <ScoreBar label="Color Contrast" score={result.scores.color_contrast} />
          <ScoreBar label="Text Readability" score={result.scores.text_readability} />
          <ScoreBar label="Emotional Appeal" score={result.scores.emotional_appeal} />
          <ScoreBar label="Clutter Score" score={result.scores.clutter_score} />
        </div>

        {/* Recommendations */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-medium text-slate-700 mb-2">💡 Tips:</p>
          <ul className="text-xs text-slate-600 space-y-1">
            {result.recommendations.map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }) {
  const getColor = (s) => {
    if (s >= 75) return "bg-green-500";
    if (s >= 50) return "bg-blue-500";
    if (s >= 25) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
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
          <Sparkles className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">Ready to See Your Future?</div>
          {primaryChannel ? (
            <>
              <div className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                Click "Analyze Now" to generate growth forecasts and competitive insights for: <strong>{primaryChannel.name}</strong>
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

// Growth Forecast View (Main View)
function GrowthForecastView({ data, primaryName }) {
  const primary = data.primary_channel;
  const predictions = primary.subscriber_predictions;
  const engagementPred = primary.engagement_predictions;
  
  // Generate chart data for growth trajectory
  const chartData = [
    {
      month: "Now",
      subscribers: primary.subscribers,
      label: "Current"
    },
    {
      month: "3 Months",
      subscribers: predictions.predicted_3_months,
      label: `+${formatNumber(predictions.growth_3_months)}`
    },
    {
      month: "6 Months",
      subscribers: predictions.predicted_6_months,
      label: `+${formatNumber(predictions.growth_6_months)}`
    },
    {
      month: "12 Months",
      subscribers: predictions.predicted_12_months,
      label: `+${formatNumber(predictions.growth_12_months)}`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Forecast Card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={28} />
          <h2 className="text-2xl font-bold">Your Growth Forecast</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="rounded-xl p-5 bg-white/10 backdrop-blur border border-white/20">
            <div className="text-sm font-medium text-white/80 mb-2">Current Subscribers</div>
            <div className="text-3xl font-bold mb-1">{formatNumber(primary.subscribers)}</div>
            <div className="text-xs text-white/70">Starting point</div>
          </div>
          
          <div className="rounded-xl p-5 bg-white/20 border-2 border-white/40 backdrop-blur">
            <div className="text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
              <Target size={16} />
              6-Month Forecast
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(predictions.predicted_6_months)}</div>
            <div className="text-xs text-white/80 flex items-center gap-1">
              <TrendingUp size={14} />
              +{formatNumber(predictions.growth_6_months)} new subscribers
            </div>
          </div>
          
          <div className="rounded-xl p-5 bg-white/10 backdrop-blur border border-white/20">
            <div className="text-sm font-medium text-white/80 mb-2">Monthly Growth</div>
            <div className="text-3xl font-bold mb-1">{predictions.monthly_growth_rate}%</div>
            <div className="text-xs text-white/70">Avg. per month</div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur border border-white/20">
          <div className="text-sm font-semibold text-white/90 mb-4">Projected Growth Trajectory</div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="month" 
                  stroke="rgba(255,255,255,0.7)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.7)"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [formatNumber(value), "Subscribers"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="subscribers" 
                  stroke="#ffffff" 
                  strokeWidth={3}
                  fill="url(#subscriberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <div className={`px-3 py-1 rounded-full font-semibold ${
            predictions.confidence === "high" ? "bg-green-500/20 text-green-100 border border-green-400/30" :
            predictions.confidence === "medium" ? "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30" :
            "bg-slate-500/20 text-slate-100 border border-slate-400/30"
          }`}>
            {predictions.confidence.toUpperCase()} CONFIDENCE
          </div>
          <span className="text-white/70">
            Based on {primary.video_count} videos of performance data
          </span>
        </div>
      </div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Growth Breakdown */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={20} />
            Growth Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Next 3 Months</span>
              <div className="text-right">
                <div className="font-bold text-slate-900">+{formatNumber(predictions.growth_3_months)}</div>
                <div className="text-xs text-slate-500">subscribers</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border-2 border-indigo-200">
              <span className="text-sm font-medium text-slate-700">Next 6 Months</span>
              <div className="text-right">
                <div className="font-bold text-indigo-600">+{formatNumber(predictions.growth_6_months)}</div>
                <div className="text-xs text-slate-500">{predictions.growth_rate_6_months}% increase</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Next 12 Months</span>
              <div className="text-right">
                <div className="font-bold text-slate-900">+{formatNumber(predictions.growth_12_months)}</div>
                <div className="text-xs text-slate-500">subscribers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Forecast - SIMPLIFIED */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ThumbsUp className="text-indigo-600" size={20} />
            Engagement Forecast
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Current Level</span>
                <span className={`font-semibold text-lg ${getEngagementLevel(engagementPred.current_engagement_rate).color}`}>
                  {getEngagementLevel(engagementPred.current_engagement_rate).label}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-slate-600">Projected (6 months)</span>
                <span className={`font-semibold text-lg ${
                  engagementPred.trend === "improving" ? "text-green-600" :
                  engagementPred.trend === "declining" ? "text-red-600" :
                  "text-blue-600"
                }`}>
                  {getEngagementLevel(engagementPred.predicted_6m_engagement).label}
                </span>
              </div>
              
              {/* Simple progress bar */}
              <div className="relative h-8 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all flex items-center justify-center text-white text-xs font-bold ${
                    engagementPred.trend === "improving" ? "bg-green-500" :
                    engagementPred.trend === "declining" ? "bg-red-500" :
                    "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, engagementPred.predicted_6m_engagement * 2000)}%` }}
                >
                  {engagementPred.trend === "improving" && "Improving"}
                  {engagementPred.trend === "declining" && "Declining"}
                  {engagementPred.trend === "stable" && "Stable"}
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border-2 ${
              engagementPred.trend === "improving" ? "bg-green-50 border-green-200" :
              engagementPred.trend === "declining" ? "bg-red-50 border-red-200" :
              "bg-blue-50 border-blue-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {engagementPred.trend === "improving" && <TrendingUp className="text-green-600" size={20} />}
                {engagementPred.trend === "declining" && <TrendingDown className="text-red-600" size={20} />}
                {engagementPred.trend === "stable" && <Activity className="text-blue-600" size={20} />}
                <span className={`text-sm font-bold ${
                  engagementPred.trend === "improving" ? "text-green-700" :
                  engagementPred.trend === "declining" ? "text-red-700" :
                  "text-blue-700"
                }`}>
                  {engagementPred.trend === "improving" && "Great News!"}
                  {engagementPred.trend === "declining" && "Needs Attention"}
                  {engagementPred.trend === "stable" && "Steady Performance"}
                </span>
              </div>
              <div className="text-xs text-slate-700">
                {engagementPred.trend === "improving" && 
                  "Your viewers are becoming more engaged over time. Keep doing what you're doing!"}
                {engagementPred.trend === "declining" && 
                  "Your engagement is trending down. Try asking more questions and responding to comments."}
                {engagementPred.trend === "stable" && 
                  "Your engagement is consistent. Look for ways to boost interaction even higher."}
              </div>
            </div>

            {engagementPred.factors && engagementPred.factors.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">Key Factors:</div>
                <ul className="space-y-1">
                  {engagementPred.factors.slice(0, 2).map((factor, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-indigo-600 mt-0.5">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items from Competitive Insights */}
      {data.competitive_insights?.action_items && data.competitive_insights.action_items.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            Recommended Actions to Hit Your Goals
          </h3>
          <div className="space-y-4">
            {data.competitive_insights.action_items.map((item, idx) => (
              <ActionItemCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* What These Numbers Mean */}
      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lightbulb className="text-indigo-600" size={20} />
          Understanding Your Forecast
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div>
            <div className="font-semibold mb-2">How We Calculate This:</div>
            <ul className="space-y-1 text-slate-600">
              <li className="flex items-start gap-2">
                <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-indigo-600" />
                <span>Analyzed your last {primary.video_count} videos for patterns</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-indigo-600" />
                <span>Factored in engagement rates and view trends</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-indigo-600" />
                <span>Projected forward using growth momentum</span>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">To Achieve This Forecast:</div>
            <ul className="space-y-1 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                <span>Maintain consistent upload schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                <span>Keep engagement levels at current rates or higher</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                <span>Continue producing quality content your audience loves</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Competitive Timeline View - SIMPLIFIED
function CompetitiveTimelineView({ data, primaryName }) {
  const primary = data.primary_channel;
  const competitors = data.competitors || [];
  const growthComparisons = data.growth_comparisons || [];

  if (growthComparisons.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center text-slate-600">
            <Users className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Competitors Selected</h3>
            <p className="text-slate-600">Select competitor channels from the sidebar to see growth comparisons</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Description */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <HelpCircle className="text-indigo-600" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Competitive Growth Timeline</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              This shows when you'll catch up to your competitors based on current growth rates. 
              If you're behind, you'll see how many months until you reach their size. 
              If you're ahead, you'll see how fast they're growing.
            </p>
          </div>
        </div>
      </div>

      {/* Growth Comparison Chart with Insights */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">6-Month Growth Comparison</h3>
        <p className="text-sm text-slate-600 mb-4">
          Current subscribers vs. where everyone will be in 6 months
        </p>
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: primaryName || "You",
                  current: primary.subscribers,
                  predicted: primary.subscriber_predictions.predicted_6_months,
                  isPrimary: true
                },
                ...competitors.map(c => ({
                  name: c.channel_name,
                  current: c.subscribers,
                  predicted: c.subscriber_predictions.predicted_6_months,
                  isPrimary: false
                }))
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-15} 
                textAnchor="end" 
                height={80} 
                style={{ fontSize: '12px' }} 
              />
              <YAxis 
                tickFormatter={(value) => formatNumber(value)}
                style={{ fontSize: '12px' }}
              />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Legend />
              <Bar dataKey="current" name="Current" radius={[8, 8, 0, 0]}>
                {[true, ...competitors.map(() => false)].map((isPrimary, index) => (
                  <Cell key={`cell-current-${index}`} fill={isPrimary ? "#4f46e5" : "#cbd5e1"} />
                ))}
              </Bar>
              <Bar dataKey="predicted" name="Predicted (6M)" radius={[8, 8, 0, 0]}>
                {[true, ...competitors.map(() => false)].map((isPrimary, index) => (
                  <Cell key={`cell-pred-${index}`} fill={isPrimary ? "#6366f1" : "#e0e7ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Simple Chart Insight */}
        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Lightbulb className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <div className="font-semibold text-slate-900 mb-1">What This Shows:</div>
              <p className="text-sm text-slate-700">
                The darker bars show where you and competitors are <strong>right now</strong>. 
                The lighter bars show where everyone will be <strong>in 6 months</strong> if current trends continue. 
                The gap between the bars shows how much each channel will grow.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Comparisons - SIMPLIFIED */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Detailed Comparisons</h3>
        {growthComparisons.map((comparison, idx) => (
          <SimpleCompetitorCard key={idx} comparison={comparison} primary={primary} />
        ))}
      </div>

      {/* Strengths and Opportunities */}
      {data.competitive_insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.competitive_insights.strengths && data.competitive_insights.strengths.length > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Award className="text-green-600" size={20} />
                Your Competitive Advantages
              </h4>
              <div className="space-y-3">
                {data.competitive_insights.strengths.map((strength, i) => (
                  <div key={i} className={`p-3 rounded-lg border-2 ${
                    strength.impact === "high" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
                  }`}>
                    <div className="font-semibold text-sm text-slate-900 mb-1">{strength.area}</div>
                    <div className="text-sm text-slate-700">{strength.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.competitive_insights.opportunities && data.competitive_insights.opportunities.length > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Target className="text-orange-600" size={20} />
                Growth Opportunities
              </h4>
              <div className="space-y-3">
                {data.competitive_insights.opportunities.map((opp, i) => (
                  <div key={i} className={`p-3 rounded-lg border-2 ${
                    opp.impact === "high" ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <div className="font-semibold text-sm text-slate-900 mb-1">{opp.area}</div>
                    <div className="text-sm text-slate-700 mb-2">{opp.message}</div>
                    {opp.action && (
                      <div className="text-xs text-slate-600 flex items-start gap-2">
                        <ArrowRight size={14} className="mt-0.5 flex-shrink-0 text-orange-600" />
                        <span className="font-medium">{opp.action}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Engagement Prediction View - SIMPLIFIED
function EngagementPredictionView({ data, primaryName }) {
  const primary = data.primary_channel;
  const engagementPred = primary.engagement_predictions;
  const competitors = data.competitors || [];

  const qualityInfo = getQualityDescription(primary.audience_quality);
  const currentLevel = getEngagementLevel(engagementPred.current_engagement_rate);
  const predictedLevel = getEngagementLevel(engagementPred.predicted_6m_engagement);

  return (
    <div className="space-y-6">
      {/* Header with Description */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <HelpCircle className="text-purple-600" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Engagement Trends</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              This shows if your viewers are becoming more engaged with your videos over time. 
              Higher engagement means people are liking, commenting, and sharing more - which helps your channel grow faster.
            </p>
          </div>
        </div>
      </div>

      {/* Engagement Forecast Header - SIMPLIFIED */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={28} />
          <h2 className="text-2xl font-bold">Your Engagement Forecast</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-5 bg-white/10 backdrop-blur border border-white/20">
            <div className="text-sm font-medium text-white/80 mb-2">Current Level</div>
            <div className="text-3xl font-bold mb-1">
              {currentLevel.label}
            </div>
            <div className="text-xs text-white/70">How engaged viewers are now</div>
          </div>
          
          <div className="rounded-xl p-5 bg-white/20 border-2 border-white/40 backdrop-blur">
            <div className="text-sm font-medium text-white/90 mb-2">Projected (6 months)</div>
            <div className="text-3xl font-bold mb-1">
              {predictedLevel.label}
            </div>
            <div className="text-xs text-white/80 flex items-center gap-1">
              {engagementPred.trend === "improving" && (
                <>
                  <TrendingUp size={14} />
                  Getting better!
                </>
              )}
              {engagementPred.trend === "declining" && (
                <>
                  <TrendingDown size={14} />
                  Needs work
                </>
              )}
              {engagementPred.trend === "stable" && "Staying steady"}
            </div>
          </div>
          
          <div className="rounded-xl p-5 bg-white/10 backdrop-blur border border-white/20">
            <div className="text-sm font-medium text-white/80 mb-2">Trend Direction</div>
            <div className="text-2xl font-bold mb-1 capitalize flex items-center gap-2">
              {engagementPred.trend === "improving" && (
                <>
                  <TrendingUp size={24} />
                  <span>Improving</span>
                </>
              )}
              {engagementPred.trend === "declining" && (
                <>
                  <TrendingDown size={24} />
                  <span>Declining</span>
                </>
              )}
              {engagementPred.trend === "stable" && (
                <>
                  <Activity size={24} />
                  <span>Stable</span>
                </>
              )}
            </div>
            <div className="text-xs text-white/70">
              {engagementPred.trend === "improving" ? "Keep it up!" : 
               engagementPred.trend === "declining" ? "Needs attention" : 
               "Maintaining steady"}
            </div>
          </div>
        </div>

        {/* Simple Visual Representation */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur border border-white/20">
          <div className="text-sm font-semibold text-white/90 mb-3">Engagement Journey</div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-white/70 mb-2">
                <span>Now</span>
                <span>6 Months</span>
              </div>
              <div className="relative h-12 bg-white/20 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      engagementPred.trend === "improving" ? "bg-green-400" :
                      engagementPred.trend === "declining" ? "bg-red-400" :
                      "bg-blue-400"
                    }`}
                    style={{ width: `${Math.min(100, engagementPred.current_engagement_rate * 2000)}%` }}
                  />
                  <div 
                    className={`absolute h-full border-2 border-dashed transition-all ${
                      engagementPred.trend === "improving" ? "border-green-200" :
                      engagementPred.trend === "declining" ? "border-red-200" :
                      "border-blue-200"
                    }`}
                    style={{ 
                      left: `${Math.min(100, engagementPred.predicted_6m_engagement * 2000)}%`,
                      width: '2px'
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-white/90 mt-2">
                <span className="font-semibold">{currentLevel.label}</span>
                <span className="font-semibold">{predictedLevel.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audience Quality */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Star className="text-indigo-600" size={24} />
          Current Audience Quality
        </h3>
        
        <div className={`p-5 rounded-xl border-2 ${qualityInfo.borderColor} ${qualityInfo.bgColor}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className={`text-2xl font-bold mb-1 ${qualityInfo.color}`}>{qualityInfo.label}</div>
              <div className="text-sm text-slate-700">{qualityInfo.description}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900">{primary.audience_quality}</div>
              <div className="text-xs text-slate-500">out of 100</div>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
            <div 
              className={`h-2 rounded-full transition-all ${qualityInfo.color.replace('text-', 'bg-')}`}
              style={{ width: `${primary.audience_quality}%` }}
            />
          </div>
        </div>
      </div>

      {/* Factors Affecting Engagement */}
      {engagementPred.factors && engagementPred.factors.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Info className="text-indigo-600" size={20} />
            What's Affecting Your Engagement
          </h3>
          <div className="space-y-3">
            {engagementPred.factors.map((factor, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Activity size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{factor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Tips */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="text-amber-500" size={20} />
          How to Boost Your Engagement
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Quick Wins (Start Today)
            </h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Reply to comments within first hour of posting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Ask a specific question at end of each video</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Pin an engaging question in the comments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Create polls and community posts between videos</span>
              </li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Target size={16} className="text-blue-600" />
              Long-term Strategy
            </h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Build a content series to bring viewers back</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Feature viewer comments in follow-up videos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Create exclusive content for engaged subscribers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Host live Q&A sessions regularly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function ActionItemCard({ item }) {
  const getPriorityColor = (priority) => {
    if (priority === "high") return { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", badge: "bg-red-100 text-red-700" };
    if (priority === "medium") return { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" };
    return { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" };
  };

  const colors = getPriorityColor(item.priority);

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-slate-900">{item.title}</h4>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.badge}`}>
              {item.priority.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-slate-700 mb-3">{item.description}</p>
        </div>
      </div>
      
      {item.actions && item.actions.length > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-white/50">
          <div className="text-xs font-semibold text-slate-700 mb-2">Action Steps:</div>
          <ul className="space-y-2">
            {item.actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <ChevronRight size={16} className={`mt-0.5 flex-shrink-0 ${colors.text}`} />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Simplified Competitor Card
function SimpleCompetitorCard({ comparison, primary }) {
  const isAhead = comparison.is_ahead;
  const willOvertake = comparison.will_overtake_in_6m;
  const isFaster = comparison.growth_comparison.includes("faster");

  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900 mb-2">{comparison.competitor_name}</h4>
          
          {/* Simple Status Badge */}
          {willOvertake && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full mb-2">
              <TrendingUp size={16} />
              You'll Overtake Them!
            </div>
          )}
          {!willOvertake && isAhead && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full mb-2">
              <CheckCircle size={16} />
              You're Ahead
            </div>
          )}
          {!willOvertake && !isAhead && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 text-sm font-bold rounded-full mb-2">
              <Target size={16} />
              They're Ahead
            </div>
          )}
        </div>
      </div>

      {/* Simple Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <div className="text-xs text-slate-600 mb-1">Size Difference</div>
          <div className={`text-lg font-bold ${
            comparison.current_size_diff > 0 ? "text-green-600" : "text-red-600"
          }`}>
            {comparison.current_size_diff > 0 ? "+" : ""}{formatNumber(comparison.current_size_diff)}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <div className="text-xs text-slate-600 mb-1">Your Speed</div>
          <div className={`text-sm font-bold flex items-center justify-center gap-1 ${
            isFaster ? "text-green-600" : "text-red-600"
          }`}>
            {isFaster ? (
              <>
                <TrendingUp size={16} />
                <span>Faster</span>
              </>
            ) : (
              <>
                <TrendingDown size={16} />
                <span>Slower</span>
              </>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <div className="text-xs text-slate-600 mb-1">Timeline</div>
          <div className="text-sm font-bold text-slate-900">
            {comparison.months_to_match_their_size ? 
              `${comparison.months_to_match_their_size} mo` : 
             comparison.months_for_them_to_match_you ?
              `${comparison.months_for_them_to_match_you} mo` :
              "N/A"}
          </div>
        </div>
      </div>

      {/* Simple Insight */}
      <div className={`p-4 rounded-lg ${
        willOvertake ? "bg-green-50 border-2 border-green-200" :
        isAhead ? "bg-blue-50 border-2 border-blue-200" :
        "bg-orange-50 border-2 border-orange-200"
      }`}>
        <p className="text-sm text-slate-700">
          {willOvertake ? 
            `Great news! You're growing faster and will catch up within 6 months!` :
           isAhead ?
            `You're currently ahead. ${isFaster ? "Keep up your momentum to stay in the lead!" : "They're catching up - time to accelerate your growth!"}` :
           comparison.months_to_match_their_size ?
            `You'll reach their current size in about ${comparison.months_to_match_their_size} months if you keep growing at your current rate.` :
            "Keep focusing on your growth strategy to close the gap."}
        </p>
      </div>
    </div>
  );
}