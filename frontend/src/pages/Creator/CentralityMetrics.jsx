import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PlayCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useAuth } from "../../core/context/AuthContext";

export default function CentralityMetrics() {
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Transform data for display
  const videoInsights = useMemo(() => {
    return nodes.map((id) => ({
      id,
      title: videos[id]?.title || id,
      views: videos[id]?.views || 0,
      content_influence: scores.content_influence?.[id] || 0,
      role: roles[id]?.primary_role || null,
      roleData: roles[id] || {},
    }));
  }, [nodes, videos, scores, roles]);

  // Map backend roles to plain language (internal only)
  const getRoleDescription = (backendRole) => {
    const roleMap = {
      "Anchor Video": {
        description: "Keeps viewers watching",
        why: "This video connects well with your other content, so viewers who like it tend to watch more.",
        action: "Create more videos like this to build a loyal audience.",
      },
      "Explorer Video": {
        description: "Helps viewers find more videos",
        why: "This video helps viewers discover different topics on your channel.",
        action: "Add this to playlists and use it in end screens to guide viewers to new content.",
      },
      "Entry Video": {
        description: "Works well for new viewers",
        why: "This is a great starting point for people who haven't seen your channel before.",
        action: "Use this as your channel trailer or pin it to help new viewers understand what you do.",
      },
    };
    return roleMap[backendRole] || {
      description: "Part of your content",
      why: "This video contributes to your channel in its own way.",
      action: "Keep creating content that feels authentic to you.",
    };
  };

  // Videos helping the channel (highest content_influence)
  const helpingVideos = useMemo(() => {
    return [...videoInsights]
      .filter((v) => v.content_influence > 0)
      .sort((a, b) => b.content_influence - a.content_influence)
      .slice(0, 5);
  }, [videoInsights]);

  // Videos needing improvement (lowest content_influence)
  const needsImprovementVideos = useMemo(() => {
    return [...videoInsights]
      .filter((v) => v.content_influence >= 0)
      .sort((a, b) => a.content_influence - b.content_influence)
      .slice(0, 5);
  }, [videoInsights]);

  // Determine channel status
  const channelStatus = useMemo(() => {
    const label = summary.cohesion_label || "Building";
    const statusMap = {
      Strong: { label: "Strong", color: "emerald" },
      Moderate: { label: "Moderate", color: "amber" },
      Building: { label: "Building", color: "blue" },
    };
    return statusMap[label] || statusMap.Building;
  }, [summary.cohesion_label]);

  if (loading) {
    return (
      <Shell>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Analyzing your content...</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium">Unable to analyze content</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </Shell>
    );
  }

  if (nodes.length === 0) {
    return (
      <Shell>
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
    <Shell>
      {/* Channel Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="bg-slate-900 text-white p-3 rounded-lg">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-slate-900">Channel Overview</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  channelStatus.color === "emerald"
                    ? "bg-emerald-100 text-emerald-700"
                    : channelStatus.color === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {channelStatus.label}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {summary.cohesion_explanation || "Your content is growing!"}
            </p>
          </div>
        </div>
      </div>

      {/* Videos That Are Helping Your Channel */}
      {helpingVideos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg">
              <ThumbsUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">What's Working Well</h2>
              <p className="text-sm text-slate-600">
                These videos are helping your channel grow. Keep doing more of this.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {helpingVideos.map((video) => {
              const roleInfo = video.role ? getRoleDescription(video.role) : null;
              return (
                <VideoCard
                  key={video.id}
                  video={video}
                  type="helping"
                  roleInfo={roleInfo}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Videos That Need Improvement */}
      {needsImprovementVideos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-amber-100 text-amber-700 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">What Needs Improvement</h2>
              <p className="text-sm text-slate-600">
                These videos could do more to help your channel. Here's how to improve them.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {needsImprovementVideos.map((video) => {
              const roleInfo = video.role ? getRoleDescription(video.role) : null;
              return (
                <VideoCard
                  key={video.id}
                  video={video}
                  type="needs-improvement"
                  roleInfo={roleInfo}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* What Each Video Is Doing */}
      {videoInsights.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-indigo-100 text-indigo-700 p-3 rounded-lg">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">What Each Video Is Doing</h2>
              <p className="text-sm text-slate-600">
                Understanding how each video helps your channel can guide your content strategy.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {videoInsights.slice(0, 8).map((video) => {
              const roleInfo = video.role ? getRoleDescription(video.role) : null;
              if (!roleInfo) return null;
              return (
                <div
                  key={video.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                      {video.id && typeof video.id === "string" ? (
                        <a
                          href={
                            video.id.startsWith("http") || video.id.startsWith("//")
                              ? video.id
                              : `https://www.youtube.com/watch?v=${video.id}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-slate-900 text-sm mb-2 line-clamp-2 block"
                          title={video.title}
                        >
                          {video.title}
                        </a>
                      ) : (
                        <p className="font-medium text-slate-900 text-sm mb-2 line-clamp-2" title={video.title}>
                          {video.title}
                        </p>
                      )}
                  <p className="text-xs text-slate-600 mb-2">{roleInfo.description}</p>
                  <p className="text-xs text-slate-500 italic">{roleInfo.why}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-indigo-700">{roleInfo.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What You Should Do Next */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-indigo-600 text-white p-3 rounded-lg">
              <ArrowRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">What You Should Do Next</h2>
              <p className="text-sm text-slate-600">
                Actionable guidance to help you grow your channel.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <InsightCard key={idx} text={insight} />
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Centrality Metrics</h1>
        <p className="text-sm text-slate-600">
          Clear feedback on what's helping your channel — and what needs work.
        </p>
      </div>
      {children}
    </div>
  );
}

function VideoCard({ video, type, roleInfo }) {
  const isHelping = type === "helping";

  // compute a safe YouTube URL for this video id/key
  const videoUrl =
    video?.id && typeof video.id === "string"
      ? video.id.startsWith("http") || video.id.startsWith("//")
        ? video.id
        : `https://www.youtube.com/watch?v=${video.id}`
      : undefined;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isHelping
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-amber-200 bg-amber-50/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            isHelping ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isHelping ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {videoUrl ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-900 mb-2 line-clamp-2 block"
              title={video.title}
            >
              {video.title}
            </a>
          ) : (
            <p className="font-semibold text-slate-900 mb-2 line-clamp-2" title={video.title}>
              {video.title}
            </p>
          )}
          {isHelping ? (
            <>
              {roleInfo && (
                <p className="text-sm text-slate-700 mb-2">
                  {roleInfo.description}. {roleInfo.why}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <p className="text-sm font-medium text-emerald-800">
                  ✓ {roleInfo?.action || "Create more videos like this"}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-700 mb-2">
                This video gets views but doesn't lead viewers to more of your content.
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                <p className="text-sm font-medium text-amber-800">Try these improvements:</p>
                <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
                  <li>Add links to stronger videos in the description</li>
                  <li>Improve the title or thumbnail to better match your channel</li>
                  <li>Add a clearer call-to-action at the end</li>
                  <li>Place it later in playlists so viewers see your best content first</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ text }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-white border border-indigo-100">
      <div className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        <ArrowRight className="w-3 h-3" />
      </div>
      <p className="text-sm text-slate-700 flex-1 leading-relaxed">{text}</p>
    </div>
  );
}