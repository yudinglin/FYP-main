import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Zap,
  Link2,
  Award,
  Sparkles,
  Info,
  Gauge,
  Shield,
  Target,
  ArrowRight,
  PlayCircle,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../../core/context/AuthContext";

export default function CentralityMetrics() {
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const channelUrl = user.youtube_channel;
        if (!channelUrl) {
          throw new Error("No channel connected. Link your channel to view insights.");
        }

        const encodedUrl = encodeURIComponent(channelUrl);

        const [centralityRes, networkRes] = await Promise.all([
          fetch(
            `http://localhost:5000/api/youtube/videos.centralityMetrics?url=${encodedUrl}`
          ),
          fetch(
            `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${encodedUrl}&maxVideos=50`
          ),
        ]);

        if (!centralityRes.ok) throw new Error("Failed to fetch content insights");
        if (!networkRes.ok) throw new Error("Failed to fetch video details");

        const centralityData = await centralityRes.json();
        const networkData = await networkRes.json();
        setData(centralityData);

        const videoMap = {};
        (networkData.rawMetrics || []).forEach((v) => {
          videoMap[v.id || v.videoId] = {
            title: v.title || "Untitled",
            views: Number(v.views) || 0,
            likes: Number(v.likes) || 0,
            comments: Number(v.comments) || 0,
          };
        });
        setVideos(videoMap);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const nodes = data?.nodes || [];
  const scores = data?.scores || {};
  const roles = data?.roles || {};
  const summary = data?.summary || {
    total_videos: nodes.length,
    total_connections: 0,
    content_cohesion: 0,
    cohesion_label: "Building",
    cohesion_explanation: "Your content is growing!",
  };
  const insights = data?.insights || [];

  // Transform data to use creator-friendly metrics
  const videoInsights = useMemo(() => {
    return nodes.map((id) => ({
      id,
      title: videos[id]?.title || id,
      views: videos[id]?.views || 0,
      retention_strength: scores.retention_strength?.[id] || 0,
      discoverability_score: scores.discoverability_score?.[id] || 0,
      entry_friendliness: scores.entry_friendliness?.[id] || 0,
      content_influence: scores.content_influence?.[id] || 0,
      role: roles[id]?.primary_role || "Unknown",
      roleData: roles[id] || {},
      // Keep raw centrality for technical view
      raw: data?.centrality || {},
    }));
  }, [nodes, videos, scores, roles, data]);

  // Group videos by role
  const roleBuckets = useMemo(() => {
    const bucket = {
      "Anchor Video": [],
      "Explorer Video": [],
      "Entry Video": [],
    };

    videoInsights.forEach((v) => {
      if (v.role && bucket[v.role]) {
        bucket[v.role].push(v);
      }
    });

    // Sort by content influence (overall importance)
    Object.keys(bucket).forEach((key) => {
      bucket[key].sort((a, b) => b.content_influence - a.content_influence);
    });

    return bucket;
  }, [videoInsights]);

  // Get top videos for each category
  const topAnchor = roleBuckets["Anchor Video"]?.[0];
  const topExplorer = roleBuckets["Explorer Video"]?.[0];
  const topEntry = roleBuckets["Entry Video"]?.[0];

  // Get top videos by overall influence
  const topVideos = useMemo(() => {
    return [...videoInsights]
      .sort((a, b) => b.content_influence - a.content_influence)
      .slice(0, 5);
  }, [videoInsights]);

  if (loading) {
    return (
      <Shell title="Content Strategy Insights">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Analyzing your content strategy...</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell title="Content Strategy Insights">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium">Unable to analyze content</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </Shell>
    );
  }

  if (nodes.length === 0) {
    return (
      <Shell title="Content Strategy Insights">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800 font-medium mb-2">Not enough data to analyze</p>
          <p className="text-yellow-700 text-sm">
            {summary.cohesion_explanation || "Keep creating content to see insights!"}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Content Strategy Insights">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-600 max-w-2xl">
          Discover which videos to promote, link internally, and use to attract new viewers—all in plain language.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showTechnical}
            onChange={() => setShowTechnical((v) => !v)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Show technical details</span>
        </label>
      </div>

      {/* Hero Section: What should I do? */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Target className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">What videos should I focus on?</h2>
            <p className="text-sm text-slate-600">
              Based on how your videos connect, here are your top opportunities:
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ActionCard
            priority="high"
            icon={<Award className="w-5 h-5" />}
            title={topAnchor?.title || "Your anchor video"}
            description={topAnchor?.roleData?.action || "Create more videos in this style to build viewer loyalty."}
            badge="Anchor Video"
            color="purple"
            score={topAnchor?.retention_strength}
            scoreLabel="Retention"
          />
          <ActionCard
            priority="medium"
            icon={<Link2 className="w-5 h-5" />}
            title={topExplorer?.title || "Your explorer video"}
            description={topExplorer?.roleData?.action || "Feature this in playlists to help viewers discover new topics."}
            badge="Explorer Video"
            color="sky"
            score={topExplorer?.discoverability_score}
            scoreLabel="Discovery"
          />
          <ActionCard
            priority="medium"
            icon={<PlayCircle className="w-5 h-5" />}
            title={topEntry?.title || "Your entry video"}
            description={topEntry?.roleData?.action || "Use this as your channel trailer or pin it for new viewers."}
            badge="Entry Video"
            color="emerald"
            score={topEntry?.entry_friendliness}
            scoreLabel="Entry"
          />
        </div>
      </div>

      {/* Channel Health Summary */}
      <SectionCard 
        title="Your channel health" 
        icon={<BarChart3 className="w-5 h-5 text-indigo-600" />}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm text-slate-700 mb-3">{summary.cohesion_explanation}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBadge label="Videos analyzed" value={summary.total_videos} icon={<PlayCircle className="w-4 h-4" />} />
              <StatBadge label="Content connections" value={summary.total_connections} icon={<Link2 className="w-4 h-4" />} />
              <StatBadge 
                label="Content cohesion" 
                value={`${Math.round(summary.content_cohesion || 0)}%`} 
                icon={<Gauge className="w-4 h-4" />} 
              />
              <StatBadge 
                label="Status" 
                value={summary.cohesion_label} 
                icon={<Shield className="w-4 h-4" />} 
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Video Roles Explained */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <RoleCard
          title="Anchor Videos"
          subtitle="Build viewer loyalty"
          description="These videos represent your channel's core identity. They're highly connected to similar content and help build a loyal audience."
          icon={<Award className="w-5 h-5" />}
          color="purple"
          videos={roleBuckets["Anchor Video"]}
          showTechnical={showTechnical}
        />
        <RoleCard
          title="Explorer Videos"
          subtitle="Grow your reach"
          description="These videos help viewers discover new topics. Perfect for playlists and end screens to expand your audience."
          icon={<Link2 className="w-5 h-5" />}
          color="sky"
          videos={roleBuckets["Explorer Video"]}
          showTechnical={showTechnical}
        />
        <RoleCard
          title="Entry Videos"
          subtitle="Attract new viewers"
          description="These are the best starting points for new viewers. Use them as channel trailers or pin them to make great first impressions."
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          videos={roleBuckets["Entry Video"]}
          showTechnical={showTechnical}
        />
      </div>

      {/* Actionable Insights
      <SectionCard
        title="Actionable insights"
        icon={<Sparkles className="w-5 h-5 text-amber-500" />}
      >
        <div className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-sm text-slate-500">Keep creating content to see personalized insights!</p>
          ) : (
            insights.map((insight, idx) => (
              <InsightCard key={idx} text={insight} />
            ))
          )}
        </div>
      </SectionCard> */}

      {/* Top Performing Videos */}
      {topVideos.length > 0 && (
        <SectionCard
          title="Your most influential videos"
          icon={<Target className="w-5 h-5 text-indigo-600" />}
        >
          <p className="text-sm text-slate-600 mb-4">
            These videos have the strongest overall impact on your channel strategy.
          </p>
          <div className="space-y-2">
            {topVideos.map((video, idx) => (
              <VideoRankingCard
                key={video.id}
                rank={idx + 1}
                video={video}
                showTechnical={showTechnical}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Technical View */}
      {showTechnical && (
        <SectionCard
          title="Technical details"
          icon={<Info className="w-5 h-5 text-slate-500" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryStat
                label="Videos analyzed"
                value={summary.total_videos}
                icon={<PlayCircle className="w-4 h-4" />}
              />
              <SummaryStat
                label="Content connections"
                value={summary.total_connections}
                icon={<Link2 className="w-4 h-4" />}
              />
              <SummaryStat
                label="Content cohesion"
                value={`${Math.round(summary.content_cohesion || 0)}%`}
                icon={<Gauge className="w-4 h-4" />}
              />
              <SummaryStat
                label="Network status"
                value={summary.cohesion_label}
                icon={<Shield className="w-4 h-4" />}
              />
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Score Breakdown</h4>
              <TechnicalTable videos={videoInsights} />
            </div>
          </div>
        </SectionCard>
      )}
    </Shell>
  );
}

function Shell({ children, title }) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-600">
          Plain-language insights to help you grow your channel—no math required.
        </p>
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-slate-900 text-white p-2 rounded-lg">{icon}</div>
        <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ActionCard({ priority, icon, title, description, badge, color, score, scoreLabel }) {
  const colorClasses = {
    purple: "from-purple-500/10 to-purple-500/5 border-purple-200",
    sky: "from-sky-500/10 to-sky-500/5 border-sky-200",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200",
  };

  const badgeColors = {
    purple: "bg-purple-100 text-purple-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${badgeColors[color]} px-2 py-1 rounded-full text-xs font-semibold`}>
          {badge}
        </div>
        {priority === "high" && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
            Priority
          </span>
        )}
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className={`text-${color}-600`}>{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">{title}</h4>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {score !== undefined && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-500">{scoreLabel} Score:</span>
          <span className="text-sm font-semibold text-slate-900">{Math.round(score)}/100</span>
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, icon }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-slate-100 text-slate-600 p-1.5 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function RoleCard({ title, subtitle, description, icon, color, videos, showTechnical }) {
  const colorClasses = {
    purple: "from-purple-500/20 to-purple-500/5 border-purple-200",
    sky: "from-sky-500/20 to-sky-500/5 border-sky-200",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-200",
  };

  const accentColors = {
    purple: "text-purple-600 bg-purple-100",
    sky: "text-sky-600 bg-sky-100",
    emerald: "text-emerald-600 bg-emerald-100",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`${accentColors[color]} p-2 rounded-lg`}>{icon}</div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-slate-700 mb-4">{description}</p>

      {videos.length === 0 ? (
        <p className="text-sm text-slate-500">No videos in this category yet.</p>
      ) : (
        <div className="space-y-2">
          {videos.slice(0, 3).map((video, idx) => (
            <div key={video.id} className="bg-white border border-slate-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate" title={video.title}>
                    {video.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {video.views.toLocaleString()} views
                  </p>
                </div>
                {idx === 0 && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
                    Top
                  </span>
                )}
              </div>
              {showTechnical && (
                <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                  <div>Retention: {Math.round(video.retention_strength)}</div>
                  <div>Discovery: {Math.round(video.discoverability_score)}</div>
                  <div>Entry: {Math.round(video.entry_friendliness)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ text }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
      <div className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        <ArrowRight className="w-3 h-3" />
      </div>
      <p className="text-sm text-slate-700 flex-1">{text}</p>
    </div>
  );
}

function VideoRankingCard({ rank, video, showTechnical }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shrink-0">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 mb-1 truncate" title={video.title}>
            {video.title}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
            <span>{video.views.toLocaleString()} views</span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
              {video.role}
            </span>
          </div>
          {showTechnical && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-xs">
              <ScoreBadge label="Influence" value={Math.round(video.content_influence)} />
              <ScoreBadge label="Retention" value={Math.round(video.retention_strength)} />
              <ScoreBadge label="Discovery" value={Math.round(video.discoverability_score)} />
              <ScoreBadge label="Entry" value={Math.round(video.entry_friendliness)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, value }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function SummaryStat({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <div className="bg-slate-900 text-white p-2 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function TechnicalTable({ videos }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">Video</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600">Retention</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600">Discovery</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600">Entry</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600">Influence</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600">Role</th>
          </tr>
        </thead>
        <tbody>
          {videos.slice(0, 10).map((video) => (
            <tr key={video.id} className="border-b border-slate-100">
              <td className="py-2 px-3">
                <p className="font-medium text-slate-900 truncate max-w-xs" title={video.title}>
                  {video.title}
                </p>
              </td>
              <td className="text-center py-2 px-3">
                <span className="text-xs font-medium">{Math.round(video.retention_strength)}</span>
              </td>
              <td className="text-center py-2 px-3">
                <span className="text-xs font-medium">{Math.round(video.discoverability_score)}</span>
              </td>
              <td className="text-center py-2 px-3">
                <span className="text-xs font-medium">{Math.round(video.entry_friendliness)}</span>
              </td>
              <td className="text-center py-2 px-3">
                <span className="text-xs font-semibold text-indigo-600">{Math.round(video.content_influence)}</span>
              </td>
              <td className="text-center py-2 px-3">
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                  {video.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
