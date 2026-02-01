// import React, { useEffect, useState } from "react";
// import {
//   TrendingUp,
//   Sparkles,
//   AlertCircle,
//   CheckCircle,
//   Zap,
//   Target,
//   Award,
//   Activity,
//   ArrowRight,
//   ExternalLink,
//   ThumbsUp,
//   MessageSquare,
//   Eye,
//   Clock,
//   TrendingDown,
//   Users,
//   Flame,
//   Calendar,
//   Lightbulb,
// } from "lucide-react";
// import { useAuth } from "../../core/context/AuthContext";

// export default function CentralityMetrics() {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const { user } = useAuth();

//   useEffect(() => {
//     async function fetchData() {
//       try {
//         const channelUrl = user.youtube_channel;
//         if (!channelUrl) {
//           throw new Error("No channel connected. Link your channel to view insights.");
//         }

//         const encodedUrl = encodeURIComponent(channelUrl);
//         const response = await fetch(
//           `http://localhost:5000/api/youtube/videos.centralityMetrics?url=${encodedUrl}`
//         );

//         if (!response.ok) throw new Error("Failed to fetch performance insights");

//         const performanceData = await response.json();
//         setData(performanceData);
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchData();
//   }, [user]);

//   if (loading) {
//     return (
//       <Shell>
//         <div className="bg-white rounded-xl shadow-sm p-8 text-center">
//           <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
//           <p className="mt-4 text-slate-600">Analyzing your content strategy...</p>
//         </div>
//       </Shell>
//     );
//   }

//   if (error) {
//     return (
//       <Shell>
//         <div className="bg-red-50 border border-red-200 rounded-xl p-6">
//           <div className="flex items-start gap-3">
//             <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
//             <div>
//               <p className="text-red-800 font-medium">Unable to analyze performance</p>
//               <p className="text-red-600 text-sm mt-1">{error}</p>
//             </div>
//           </div>
//         </div>
//       </Shell>
//     );
//   }

//   const categorized = data?.categorized_videos || {};
//   const quickWins = data?.quick_wins || [];
//   const channelHealth = data?.channel_health || {};
//   const summary = data?.summary || {};

//   const winners = categorized.winners || [];
//   const hiddenGems = categorized.hidden_gems || [];
//   const needsWork = categorized.needs_work || [];

//   if (summary.total_videos === 0) {
//     return (
//       <Shell>
//         <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
//           <div className="flex items-start gap-3">
//             <Sparkles className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
//             <div>
//               <p className="text-blue-800 font-medium mb-2">Start your journey!</p>
//               <p className="text-blue-700 text-sm">
//                 Upload some videos to get actionable insights on what's working and what needs improvement.
//               </p>
//             </div>
//           </div>
//         </div>
//       </Shell>
//     );
//   }

//   // Calculate momentum score (trend indicator)
//   const calculateMomentum = () => {
//     const score = channelHealth.overall_score || 0;
//     const trend = channelHealth.engagement_trend === 'improving' ? 'up' : 'down';
//     return {
//       current: score,
//       trend: trend,
//       benchmark: 75
//     };
//   };

//   const momentum = calculateMomentum();

//   return (
//     <Shell>
//       {/* Momentum Score Banner */}
//       <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 mb-6 text-white shadow-sm">
//         <div className="flex items-center justify-between">
//           <div className="flex-1">
//             <div className="flex items-center gap-2 mb-2">
//               <Flame className="w-5 h-5" />
//               <span className="text-sm font-medium">Channel Growth Status</span>
//             </div>
//             <div className="flex items-baseline gap-3 mb-2">
//               <span className="text-5xl font-bold">{momentum.current}</span>
//               <span className="text-2xl opacity-90">/100</span>
//             </div>
//             <p className="text-sm">
//               {momentum.current >= 70 ? "Excellent! Your channel is performing great." :
//                momentum.current >= 50 ? "Good progress. A few tweaks can boost your reach." :
//                "Room for improvement. Focus on quick wins below."}
//             </p>
//           </div>
//           <div className="flex flex-col items-end gap-2">
//             <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
//               {momentum.trend === "up" ? (
//                 <>
//                   <TrendingUp className="w-5 h-5" />
//                   <span className="font-semibold">Trending Up</span>
//                 </>
//               ) : (
//                 <>
//                   <TrendingDown className="w-5 h-5" />
//                   <span className="font-semibold">Needs Attention</span>
//                 </>
//               )}
//             </div>
//             <div className="text-right text-sm">
//               <div>Benchmark: {momentum.benchmark}</div>
//               <div className="text-xs mt-1 opacity-90">
//                 {momentum.current >= momentum.benchmark ? "Above industry average" : `${momentum.benchmark - momentum.current} pts to benchmark`}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Quick Stats Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         <StatCard
//           icon={<Activity className="w-5 h-5" />}
//           label="Health Score"
//           value={channelHealth.overall_score || 0}
//           suffix="/100"
//           color="indigo"
//           subtitle={channelHealth.health_label}
//         />
//         <StatCard
//           icon={<Target className="w-5 h-5" />}
//           label="Consistency"
//           value={channelHealth.consistency || 0}
//           suffix="%"
//           color="green"
//           subtitle="Upload quality"
//         />
//         <StatCard
//           icon={<Award className="w-5 h-5" />}
//           label="Winners"
//           value={summary.winners_count || 0}
//           color="amber"
//           subtitle="Top performers"
//         />
//         <StatCard
//           icon={<Sparkles className="w-5 h-5" />}
//           label="Hidden Gems"
//           value={summary.hidden_gems_count || 0}
//           color="purple"
//           subtitle="Untapped potential"
//         />
//       </div>

//       {/* Quick Wins - PRIORITY SECTION */}
//       {quickWins.length > 0 && (
//         <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
//           <div className="flex items-start gap-3 mb-4">
//             <div className="bg-amber-500 text-white p-3 rounded-lg">
//               <Zap className="w-6 h-6" />
//             </div>
//             <div className="flex-1">
//               <h2 className="text-xl font-bold text-slate-900">Quick Wins</h2>
//               <p className="text-sm text-slate-600 mt-1 font-medium">
//                 Take these actions now to see immediate improvements
//               </p>
//             </div>
//             <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
//               {quickWins.length} action{quickWins.length > 1 ? 's' : ''}
//             </div>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             {quickWins.map((win, idx) => (
//               <QuickWinCard key={idx} win={win} index={idx} />
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Your Winners */}
//       {winners.length > 0 && (
//         <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
//           <div className="flex items-start gap-3 mb-4">
//             <div className="bg-green-100 text-green-700 p-3 rounded-lg">
//               <Award className="w-6 h-6" />
//             </div>
//             <div className="flex-1">
//               <h2 className="text-lg font-semibold text-slate-900">Your Winners</h2>
//               <p className="text-sm text-slate-600 mt-1">
//                 These videos are crushing it. Study what makes them work.
//               </p>
//             </div>
//             <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
//               {winners.length} video{winners.length > 1 ? 's' : ''}
//             </div>
//           </div>
//           <div className="space-y-3">
//             {winners.slice(0, 5).map((video) => (
//               <VideoCard key={video.id} video={video} type="winner" />
//             ))}
//           </div>
//           <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
//             <div className="flex gap-3">
//               <Lightbulb className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
//               <div>
//                 <div className="font-semibold text-blue-900 text-sm mb-1">Strategy Insight</div>
//                 <div className="text-sm text-blue-800">
//                   Your top videos share common traits. Double down on similar topics, formats, and thumbnail styles to replicate this success.
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Hidden Gems */}
//       {hiddenGems.length > 0 && (
//         <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
//           <div className="flex items-start gap-3 mb-4">
//             <div className="bg-purple-100 text-purple-700 p-3 rounded-lg">
//               <Sparkles className="w-6 h-6" />
//             </div>
//             <div className="flex-1">
//               <h2 className="text-lg font-semibold text-slate-900">Hidden Gems</h2>
//               <p className="text-sm text-slate-600 mt-1">
//                 High engagement, low views. Promote these to unlock viral potential.
//               </p>
//             </div>
//             <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
//               {hiddenGems.length} video{hiddenGems.length > 1 ? 's' : ''}
//             </div>
//           </div>
//           <div className="space-y-3">
//             {hiddenGems.map((video) => (
//               <VideoCard key={video.id} video={video} type="hidden-gem" />
//             ))}
//           </div>
//           <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
//             <div className="flex gap-3">
//               <Lightbulb className="text-indigo-600 flex-shrink-0 mt-0.5" size={20} />
//               <div>
//                 <div className="font-semibold text-indigo-900 text-sm mb-1">Action Plan</div>
//                 <div className="text-sm text-indigo-800">
//                   Share these on Twitter, LinkedIn, and Reddit. Add them to playlists. Reference them in your popular videos' descriptions.
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Needs Work */}
//       {needsWork.length > 0 && (
//         <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
//           <div className="flex items-start gap-3 mb-4">
//             <div className="bg-orange-100 text-orange-700 p-3 rounded-lg">
//               <AlertCircle className="w-6 h-6" />
//             </div>
//             <div className="flex-1">
//               <h2 className="text-lg font-semibold text-slate-900">Needs Your Attention</h2>
//               <p className="text-sm text-slate-600 mt-1">
//                 Fix these issues to boost performance. Small changes, big impact.
//               </p>
//             </div>
//             <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
//               {needsWork.length} video{needsWork.length > 1 ? 's' : ''}
//             </div>
//           </div>
//           <div className="space-y-3">
//             {needsWork.slice(0, 5).map((video) => (
//               <VideoCard key={video.id} video={video} type="needs-work" />
//             ))}
//           </div>
//         </div>
//       )}
//     </Shell>
//   );
// }

// function Shell({ children }) {
//   return (
//     <div className="min-h-[calc(100vh-72px)] bg-gradient-to-br from-slate-50 to-slate-100 p-6 max-w-7xl mx-auto">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-slate-900 mb-1">Content Strategy Dashboard</h1>
//         <p className="text-sm text-slate-600">
//           Actionable insights to grow your channel. Focus on what works, fix what doesn't.
//         </p>
//       </div>
//       {children}
//     </div>
//   );
// }

// function StatCard({ icon, label, value, suffix = "", color, subtitle }) {
//   const colorClasses = {
//     indigo: "bg-indigo-600",
//     green: "bg-green-600",
//     amber: "bg-amber-600",
//     purple: "bg-purple-600",
//   };

//   return (
//     <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
//       <div className="flex items-center gap-3 mb-3">
//         <div className={`p-2 rounded-lg ${colorClasses[color]} text-white`}>{icon}</div>
//         <p className="text-sm font-medium text-slate-600">{label}</p>
//       </div>
//       <div className="flex items-baseline gap-1">
//         <p className="text-3xl font-bold text-slate-900">{value}</p>
//         {suffix && <p className="text-lg text-slate-500">{suffix}</p>}
//       </div>
//       {subtitle && (
//         <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
//       )}
//     </div>
//   );
// }

// function QuickWinCard({ win, index }) {
//   const impactColors = {
//     high: "bg-red-100 text-red-700",
//     medium: "bg-amber-100 text-amber-700",
//     low: "bg-blue-100 text-blue-700",
//   };

//   const effortColors = {
//     low: "bg-emerald-100 text-emerald-700",
//     medium: "bg-amber-100 text-amber-700",
//     high: "bg-red-100 text-red-700",
//   };

//   return (
//     <div className="bg-white rounded-lg border border-amber-200 p-5 hover:shadow-md transition-all">
//       <div className="flex items-start justify-between mb-3">
//         <div className="flex items-start gap-2 flex-1">
//           <div className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
//             {index + 1}
//           </div>
//           <h3 className="font-bold text-slate-900 text-base">{win.title}</h3>
//         </div>
//       </div>
//       <p className="text-sm text-slate-700 mb-3 leading-relaxed">{win.description}</p>
      
//       <div className="flex items-center gap-2 mb-3">
//         <span className={`text-xs px-3 py-1 rounded-full font-semibold ${impactColors[win.impact]}`}>
//           {win.impact.toUpperCase()} IMPACT
//         </span>
//         <span className={`text-xs px-3 py-1 rounded-full font-semibold ${effortColors[win.effort]}`}>
//           {win.effort.toUpperCase()} EFFORT
//         </span>
//       </div>

//       <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
//         <ArrowRight className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
//         <p className="text-sm font-semibold text-amber-900">{win.action}</p>
//       </div>
      
//       {win.video_count > 0 && (
//         <div className="flex items-center gap-1 mt-3 text-xs text-slate-600">
//           <Target className="w-3 h-3" />
//           <span>Affects <span className="font-semibold text-slate-900">{win.video_count}</span> video{win.video_count > 1 ? 's' : ''}</span>
//         </div>
//       )}
//     </div>
//   );
// }

// function VideoCard({ video, type }) {
//   const config = {
//     winner: {
//       borderColor: "border-green-200",
//       bgColor: "bg-gradient-to-r from-green-50 to-transparent",
//       icon: <CheckCircle className="w-5 h-5 text-green-600" />,
//       scoreColor: "text-green-600",
//       scoreBg: "bg-green-100",
//       barColor: "bg-green-500",
//     },
//     "hidden-gem": {
//       borderColor: "border-purple-200",
//       bgColor: "bg-gradient-to-r from-purple-50 to-transparent",
//       icon: <Sparkles className="w-5 h-5 text-purple-600" />,
//       scoreColor: "text-purple-600",
//       scoreBg: "bg-purple-100",
//       barColor: "bg-purple-500",
//     },
//     "needs-work": {
//       borderColor: "border-orange-200",
//       bgColor: "bg-gradient-to-r from-orange-50 to-transparent",
//       icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
//       scoreColor: "text-orange-600",
//       scoreBg: "bg-orange-100",
//       barColor: "bg-orange-500",
//     },
//   };

//   const style = config[type];
//   const score = video.performance_score || 0;
//   const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

//   const formatNumber = (num) => {
//     if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
//     if (num >= 1000) return (num / 1000).toFixed(1) + "K";
//     return Math.round(num).toString();
//   };

//   return (
//     <div className={`border ${style.borderColor} ${style.bgColor} rounded-lg p-4 hover:shadow-sm transition-shadow`}>
//       <div className="flex gap-4">
//         {/* Thumbnail */}
//         {video.thumbnail && (
//           <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
//             <img
//               src={video.thumbnail}
//               alt={video.title}
//               className="w-28 h-16 object-cover rounded-lg"
//             />
//           </a>
//         )}

//         {/* Video info */}
//         <div className="flex-1 min-w-0">
//           <a
//             href={videoUrl}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="font-semibold text-slate-900 hover:text-indigo-600 mb-1 line-clamp-2 block group"
//           >
//             {video.title}
//             <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
//           </a>

//           <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
//             <span className="flex items-center gap-1">
//               <Eye className="w-4 h-4" />
//               {formatNumber(video.views || 0)}
//             </span>
//             <span className="flex items-center gap-1">
//               <ThumbsUp className="w-4 h-4" />
//               {formatNumber(video.likes || 0)}
//             </span>
//             <span className="flex items-center gap-1">
//               <MessageSquare className="w-4 h-4" />
//               {formatNumber(video.comments || 0)}
//             </span>
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-xs text-slate-600 font-medium">Score:</span>
//             <div className={`${style.scoreBg} px-2 py-1 rounded text-xs font-bold ${style.scoreColor}`}>
//               {score}/100
//             </div>
//             <div className="flex-1 bg-slate-200 rounded-full h-2">
//               <div
//                 className={`h-2 rounded-full ${style.barColor}`}
//                 style={{ width: `${score}%` }}
//               />
//             </div>
//           </div>

//           {/* Type-specific tips */}
//           {type === "winner" && (
//             <p className="mt-3 pt-3 border-t border-green-200 text-sm font-medium text-green-800 flex items-center gap-2">
//               <TrendingUp className="w-4 h-4" /> Winning formula! Replicate this content style and format.
//             </p>
//           )}

//           {type === "hidden-gem" && (
//             <p className="mt-3 pt-3 border-t border-purple-200 text-sm font-medium text-purple-800 flex items-center gap-2">
//               <Sparkles className="w-4 h-4" /> High engagement! Promote on social media and in popular videos.
//             </p>
//           )}

//           {type === "needs-work" && video.improvements && (
//             <div className="mt-3 pt-3 border-t border-orange-200 space-y-2">
//               <p className="text-sm font-bold text-orange-800 mb-2">How to fix:</p>
//               {video.improvements.slice(0, 2).map((improvement, idx) => (
//                 <div key={idx} className="flex items-start gap-2 bg-white rounded p-2 border border-orange-100">
//                   <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0" />
//                   <div className="flex-1">
//                     <p className="text-xs text-slate-800 font-semibold">{improvement.issue}</p>
//                     <p className="text-xs text-slate-600 mt-0.5">→ {improvement.action}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
