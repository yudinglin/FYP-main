// frontend/src/pages/Creator/PredictiveAnalysis.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";

const API_BASE = "http://localhost:5000";

/**
 * PredictiveAnalysis - Predicts future subscriber growth using linear regression
 * Fetches channel data and generates historical subscriber growth based on video metrics
 */
export default function PredictiveAnalysis() {
  const [subscriberHistory, setSubscriberHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchSubscriberData() {
      setLoading(true);
      setError(null);
      try {
        const channelUrl = user.youtube_channel;
        if (!channelUrl) {
          setError("No channel URL found in localStorage.");
          setLoading(false);
          return;
        }

        const q = encodeURIComponent(channelUrl);
        
        // 1) Get current subscriber count
        const r1 = await fetch(`${API_BASE}/api/youtube/channels.list?url=${q}`);
        if (!r1.ok) throw new Error("Failed to fetch channel data");
        const channelData = await r1.json();
        const currentSubscribers = channelData.subscriberCount ?? 0;

        // 2) Get video data with publish dates to estimate historical growth
        const r2 = await fetch(
          `${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
        );
        if (!r2.ok) throw new Error("Failed to fetch video data");
        const videoData = await r2.json();
        const rawMetrics = videoData.rawMetrics ?? videoData.nodes ?? [];
        
        if (rawMetrics.length === 0) {
          setError("No video data available");
          setLoading(false);
          return;
        }

        // Generate historical subscriber data based on video publish dates
        // Sort videos by publish date (oldest first)
        const videosWithDates = rawMetrics
          .filter(v => v.publishedAt)
          .map(v => ({
            ...v,
            publishedAt: new Date(v.publishedAt),
            engagement: (v.views > 0) ? ((v.likes || 0) + (v.comments || 0)) / v.views : 0,
          }))
          .sort((a, b) => a.publishedAt - b.publishedAt);

        if (videosWithDates.length === 0) {
          setError("No videos with publish dates available");
          setLoading(false);
          return;
        }

        // Generate monthly subscriber history
        // Estimate growth based on video engagement and time
        const history = [];
        const firstDate = new Date(videosWithDates[0].publishedAt);
        firstDate.setDate(1); // Start of first month
        const lastDate = new Date();
        
        // Calculate total months
        const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                          (lastDate.getMonth() - firstDate.getMonth());
        
        // Start with a small base (10-20% of current, minimum 10)
        const startSubscribers = Math.max(10, Math.floor(currentSubscribers * 0.15));
        const totalGrowth = currentSubscribers - startSubscribers;
        
        // Create monthly data points with exponential growth curve
        let currentDate = new Date(firstDate);
        let monthIndex = 0;
        
        while (currentDate <= lastDate) {
          // Count videos published up to this month
          const videosUpToDate = videosWithDates.filter(v => v.publishedAt <= currentDate);
          
          if (videosUpToDate.length > 0) {
            // Calculate average engagement and total views
            const avgEngagement = videosWithDates
              .filter(v => v.publishedAt <= currentDate)
              .reduce((sum, v) => sum + v.engagement, 0) / videosUpToDate.length;
            
            const totalViews = videosUpToDate.reduce((sum, v) => sum + (v.views || 0), 0);
            
            // Use exponential growth with acceleration based on engagement
            // More videos and higher engagement = faster growth
            const progress = monthIndex / Math.max(1, monthsDiff);
            const engagementBoost = Math.min(avgEngagement * 2, 0.5); // Cap at 50% boost
            const viewsBoost = Math.min(totalViews / 5000000, 0.3); // Cap at 30% boost
            
            // Exponential curve with engagement/views modifiers
            const growthCurve = Math.pow(progress, 0.7 + engagementBoost + viewsBoost);
            const estimatedSubscribers = Math.floor(
              startSubscribers + (totalGrowth * growthCurve)
            );
            
            history.push({
              date: currentDate.toISOString().split("T")[0],
              subscribers: Math.min(estimatedSubscribers, currentSubscribers),
            });
          } else {
            // No videos yet, use starting value
            history.push({
              date: currentDate.toISOString().split("T")[0],
              subscribers: startSubscribers,
            });
          }

          // Move to next month
          currentDate = new Date(currentDate);
          currentDate.setMonth(currentDate.getMonth() + 1);
          monthIndex++;
        }

        // Ensure last entry has actual current subscribers
        if (history.length > 0) {
          history[history.length - 1].subscribers = currentSubscribers;
        }

        setSubscriberHistory(history);
      } catch (err) {
        console.error("Error fetching subscriber data:", err);
        setError(err.message || "Failed to load subscriber data");
        setSubscriberHistory([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriberData();
  }, [user.youtube_channel]);

  // Format date for display
  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, []);

  // Calculate linear regression and generate predictions
  const chartData = useMemo(() => {
    if (!subscriberHistory || subscriberHistory.length < 2) {
      return [];
    }

    // Convert dates to numeric values (months since first date)
    const sorted = [...subscriberHistory].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    const firstDate = new Date(sorted[0].date);
    const dataPoints = sorted.map((item, index) => {
      const date = new Date(item.date);
      const monthsSinceStart = (date - firstDate) / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
      return {
        x: monthsSinceStart,
        y: item.subscribers,
        date: item.date,
        subscribers: item.subscribers,
      };
    });

    // Calculate linear regression: y = mx + b
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // Generate historical data points
    const historical = dataPoints.map((point) => ({
      date: point.date,
      historical: point.subscribers,
      predicted: null,
    }));

    // Get the last date and subscribers
    const lastPoint = dataPoints[dataPoints.length - 1];
    const lastDate = new Date(lastPoint.date);

    // Generate predictions for next 6 months
    const predictions = [];
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setMonth(futureDate.getMonth() + i);
      
      const futureX = lastPoint.x + i;
      const predictedSubscribers = Math.round(m * futureX + b);

      predictions.push({
        date: futureDate.toISOString().split("T")[0],
        historical: null,
        predicted: predictedSubscribers,
      });
    }

    // Add a bridge point: last historical point with predicted value to connect lines
    const bridgePoint = {
      date: lastPoint.date,
      historical: lastPoint.subscribers,
      predicted: Math.round(m * lastPoint.x + b),
    };

    // Combine: historical (without last), bridge point, predictions
    return [...historical.slice(0, -1), bridgePoint, ...predictions];
  }, [subscriberHistory]);

  // Calculate growth rate and velocity data
  const growthAnalytics = useMemo(() => {
    if (!subscriberHistory || subscriberHistory.length < 2) {
      return { growthRate: [], velocity: [], milestones: [], stats: null };
    }

    const sorted = [...subscriberHistory].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Calculate growth rate and velocity
    const growthRate = [];
    const velocity = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].subscribers;
      const curr = sorted[i].subscribers;
      const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      const subscribersGained = curr - prev;
      
      growthRate.push({
        date: sorted[i].date,
        growthRate: parseFloat(growth.toFixed(2)),
      });
      
      velocity.push({
        date: sorted[i].date,
        gained: subscribersGained,
      });
    }

    // Calculate statistics
    const current = sorted[sorted.length - 1].subscribers;
    const first = sorted[0].subscribers;
    const totalGrowth = current - first;
    const avgGrowthRate = growthRate.length > 0 
      ? growthRate.reduce((sum, g) => sum + g.growthRate, 0) / growthRate.length 
      : 0;
    const avgVelocity = velocity.length > 0
      ? velocity.reduce((sum, v) => sum + v.gained, 0) / velocity.length
      : 0;

    // Get predictions for milestones
    const chartDataSorted = [...chartData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    const lastHistorical = chartDataSorted.find(d => d.historical !== null && d.predicted === null);
    const predictions = chartDataSorted.filter(d => d.predicted !== null);

    // Calculate projected milestones
    const milestones = [];
    const milestoneTargets = [
      { label: "100K", value: 100000 },
      { label: "250K", value: 250000 },
      { label: "500K", value: 500000 },
      { label: "1M", value: 1000000 },
      { label: "2.5M", value: 2500000 },
      { label: "5M", value: 5000000 },
      { label: "10M", value: 10000000 },
    ];

    milestoneTargets.forEach(milestone => {
      if (current < milestone.value) {
        // Find when we'll reach this milestone based on predictions
        const targetPoint = predictions.find(p => p.predicted >= milestone.value);
        if (targetPoint) {
          milestones.push({
            milestone: milestone.label,
            target: milestone.value,
            projectedDate: formatDate(targetPoint.date),
            monthsAway: Math.ceil(
              (new Date(targetPoint.date) - new Date()) / (1000 * 60 * 60 * 24 * 30)
            ),
          });
        }
      }
    });

    return {
      growthRate,
      velocity,
      milestones,
      stats: {
        current,
        totalGrowth,
        avgGrowthRate: parseFloat(avgGrowthRate.toFixed(2)),
        avgVelocity: Math.round(avgVelocity),
        projected6Months: predictions.length > 0 ? predictions[predictions.length - 1].predicted : current,
      },
    };
  }, [subscriberHistory, chartData, formatDate]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border-2 border-red-600 rounded-lg shadow-xl">
          <p className="text-xs font-semibold text-gray-700 mb-1">
            {formatDate(data.date)}
          </p>
          {data.historical !== null && (
            <p className="text-sm font-bold text-gray-900">
              Historical: {data.historical.toLocaleString()}
            </p>
          )}
          {data.predicted !== null && (
            <p className="text-sm font-bold text-red-600">
              Predicted: {data.predicted.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Subscriber Growth Prediction
          </h1>

        </div>

        {loading && (
          <div className="rounded-xl bg-white p-12 border-2 border-gray-200 shadow-lg">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
              <p className="ml-4 text-gray-700">Loading subscriber data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-6 border-2 border-red-200 shadow-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && (!subscriberHistory || subscriberHistory.length < 2) && (
          <div className="rounded-xl bg-white p-12 border-2 border-gray-200 shadow-lg">
            <div className="text-center">
              <p className="text-gray-600">
                {subscriberHistory?.length === 0 
                  ? "No subscriber history available. Please ensure your channel has videos with publish dates." 
                  : "At least 2 data points required for prediction"}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && subscriberHistory && subscriberHistory.length >= 2 && growthAnalytics.stats && (
          <>
            {/* Key Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Current Subscribers"
                value={growthAnalytics.stats.current.toLocaleString()}
                icon="👥"
                gradient="from-red-600 to-red-700"
              />
              <StatCard
                label="6-Month Projection"
                value={growthAnalytics.stats.projected6Months.toLocaleString()}
                icon="📈"
                gradient="from-blue-900 to-blue-950"
              />
              <StatCard
                label="Avg Growth Rate"
                value={`${growthAnalytics.stats.avgGrowthRate}%`}
                icon="⚡"
                gradient="from-red-700 to-red-800"
              />
              <StatCard
                label="Avg Monthly Gain"
                value={growthAnalytics.stats.avgVelocity.toLocaleString()}
                icon="🚀"
                gradient="from-blue-950 to-gray-900"
              />
            </div>

            {/* Main Growth Chart */}
            <div className="rounded-xl bg-white p-6 border-2 border-gray-200 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Subscriber Growth Forecast</h2>
              </div>
              <div className="w-full" style={{ height: "450px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 15, left: 5, bottom: 70 }}
                  >
                    <defs>
                      <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#4b5563"
                      style={{ fontSize: "11px", fontWeight: "500" }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="#4b5563"
                      style={{ fontSize: "11px", fontWeight: "500" }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px", fontWeight: "600" }}
                      iconType="line"
                    />
                    <Area
                      type="monotone"
                      dataKey="historical"
                      name="Historical"
                      stroke="#1e3a8a"
                      fillOpacity={1}
                      fill="url(#colorHistorical)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted (6 months)"
                      stroke="#dc2626"
                      fillOpacity={1}
                      fill="url(#colorPredicted)"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Growth Rate & Velocity Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Growth Rate Chart */}
              <div className="rounded-xl bg-white p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Growth Rate (%)</h3>
                <div className="w-full" style={{ height: "300px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthAnalytics.growthRate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#4b5563"
                        style={{ fontSize: "10px", fontWeight: "500" }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#4b5563" style={{ fontSize: "11px", fontWeight: "500" }} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #dc2626',
                          borderRadius: '8px',
                          fontWeight: '600'
                        }}
                        formatter={(value) => [`${value}%`, "Growth Rate"]}
                      />
                      <Bar dataKey="growthRate" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Growth Velocity Chart */}
              <div className="rounded-xl bg-white p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Subscribers Gained per Month</h3>
                <div className="w-full" style={{ height: "300px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={growthAnalytics.velocity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#4b5563"
                        style={{ fontSize: "10px", fontWeight: "500" }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#4b5563" style={{ fontSize: "11px", fontWeight: "500" }} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #dc2626',
                          borderRadius: '8px',
                          fontWeight: '600'
                        }}
                        formatter={(value) => [value.toLocaleString(), "Subscribers Gained"]}
                      />
                      <Bar dataKey="gained" fill="#dc2626" radius={[8, 8, 0, 0]} />
                      <Line type="monotone" dataKey="gained" stroke="#1e3a8a" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Milestones & Monthly Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Projected Milestones */}
              <div className="rounded-xl bg-white p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Projected Milestones</h3>
                {growthAnalytics.milestones.length > 0 ? (
                  <div className="space-y-3">
                    {growthAnalytics.milestones.slice(0, 5).map((milestone, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-blue-50 rounded-lg border-2 border-red-200"
                      >
                        <div>
                          <p className="text-gray-900 font-bold">{milestone.milestone} Subscribers</p>
                          <p className="text-gray-600 text-sm font-medium">{milestone.projectedDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-600 font-bold text-xl">{milestone.monthsAway}</p>
                          <p className="text-gray-600 text-xs font-medium">months away</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">All major milestones achieved! 🎉</p>
                )}
              </div>

              {/* Monthly Breakdown Table */}
              <div className="rounded-xl bg-white p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Monthly Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 text-gray-700 font-bold">Month</th>
                        <th className="text-right py-2 text-gray-700 font-bold">Subscribers</th>
                        <th className="text-right py-2 text-gray-700 font-bold">Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.slice(-8).map((item, idx) => {
                        const prevItem = chartData[chartData.indexOf(item) - 1];
                        const value = item.historical ?? item.predicted ?? 0;
                        const prevValue = prevItem ? (prevItem.historical ?? prevItem.predicted ?? 0) : value;
                        const growth = value - prevValue;
                        const isPredicted = item.predicted !== null;
                        
                        return (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="py-2 text-gray-700 font-medium">
                              {formatDate(item.date)}
                              {isPredicted && <span className="ml-2 text-xs text-red-600 font-bold">●</span>}
                            </td>
                            <td className="text-right py-2 text-gray-900 font-bold">
                              {value.toLocaleString()}
                            </td>
                            <td className={`text-right py-2 font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {growth >= 0 ? '+' : ''}{growth.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-6 border-2 border-red-600 shadow-lg">
      <p className="text-sm font-semibold text-gray-600 mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}