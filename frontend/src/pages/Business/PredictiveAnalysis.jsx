// frontend/src/pages/Business/PredictiveAnalysis.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
 * Business Predictive Analysis
 * - Single channel: same as Creator logic
 * - All channels: compute each channel history then sum by month label
 */
export default function PredictiveAnalysis() {
  const { user } = useAuth();

  const channels = Array.isArray(user?.youtube_channels) ? user.youtube_channels : [];

  const options = useMemo(() => {
    const base = [{ key: "ALL", label: "All channels (sum)", urls: channels.map((c) => c.url).filter(Boolean) }];
    const singles = channels
      .map((c, idx) => ({
        key: `CH_${idx}`,
        label: c?.name ? c.name : `Channel ${idx + 1}`,
        urls: c?.url ? [c.url] : [],
      }))
      .filter((o) => o.urls.length > 0);
    return [...base, ...singles];
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState("ALL");
  const selectedOption = options.find((o) => o.key === selectedKey) || options[0];
  const selectedUrls = selectedOption?.urls || [];

  const [subscriberHistory, setSubscriberHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- helper: build history for ONE channel (copied from Creator idea) ----
  async function buildHistoryForChannel(channelUrl) {
    const q = encodeURIComponent(channelUrl);

    // 1) current subscribers
    const r1 = await fetch(`${API_BASE}/api/youtube/channels.list?url=${q}`);
    if (!r1.ok) throw new Error("Failed to fetch channel data");
    const channelData = await r1.json();
    const currentSubscribers = channelData.subscriberCount ?? 0;

    // 2) video metrics with publish dates
    const r2 = await fetch(`${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`);
    if (!r2.ok) throw new Error("Failed to fetch video data");
    const videoData = await r2.json();
    const rawMetrics = videoData.rawMetrics ?? videoData.nodes ?? [];

    if (rawMetrics.length === 0) throw new Error("No video data available");

    const videosWithDates = rawMetrics
      .filter((v) => v.publishedAt)
      .map((v) => ({
        ...v,
        publishedAt: new Date(v.publishedAt),
        engagement: v.views > 0 ? ((v.likes || 0) + (v.comments || 0)) / v.views : 0,
      }))
      .sort((a, b) => a.publishedAt - b.publishedAt);

    if (videosWithDates.length === 0) throw new Error("No videos with publish dates available");

    const history = [];
    const firstDate = new Date(videosWithDates[0].publishedAt);
    firstDate.setDate(1);
    const lastDate = new Date();

    const monthsDiff =
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth());

    const startSubscribers = Math.max(10, Math.floor(currentSubscribers * 0.15));
    const totalGrowth = currentSubscribers - startSubscribers;

    // build month buckets
    const monthlyEngagement = new Map();
    videosWithDates.forEach((v) => {
      const key = `${v.publishedAt.getFullYear()}-${String(v.publishedAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyEngagement.set(key, (monthlyEngagement.get(key) || 0) + v.engagement);
    });

    // distribute growth based on engagement weights
    const allMonths = [];
    for (let i = 0; i <= monthsDiff; i++) {
      const d = new Date(firstDate);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      allMonths.push(key);
    }

    const weights = allMonths.map((m) => Math.max(0.1, monthlyEngagement.get(m) || 0.1));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    let running = startSubscribers;
    allMonths.forEach((m, idx) => {
      const inc = Math.round((weights[idx] / weightSum) * totalGrowth);
      running += inc;
      history.push({
        month: m,
        subscribers: running,
      });
    });

    // simple future prediction: linear trend (last 6 points)
    const lastN = history.slice(-6);
    const n = lastN.length;

    const xs = lastN.map((_, i) => i + 1);
    const ys = lastN.map((p) => p.subscribers);

    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (ys[i] - yMean);
      den += (xs[i] - xMean) * (xs[i] - xMean);
    }

    const slope = den === 0 ? 0 : num / den;

    // add 6 future months
    const future = [];
    const lastMonth = history[history.length - 1]?.month;
    const [yy, mm] = lastMonth.split("-").map(Number);
    for (let i = 1; i <= 6; i++) {
      const d = new Date(yy, mm - 1, 1);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const predicted = Math.round((ys[n - 1] || currentSubscribers) + slope * i);
      future.push({ month: key, subscribers: null, predicted: Math.max(0, predicted) });
    }

    // merge predicted into series
    const combined = history.map((h) => ({ ...h, predicted: h.subscribers }));
    future.forEach((f) => combined.push(f));

    return combined;
  }

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      setSubscriberHistory([]);

      try {
        if (!selectedUrls || selectedUrls.length === 0) {
          throw new Error("No channel connected. Please add channels in Business Profile → Link Channel.");
        }

        const histories = await Promise.all(selectedUrls.map((u) => buildHistoryForChannel(u)));

        // if single, just show it
        if (selectedKey !== "ALL" || histories.length === 1) {
          setSubscriberHistory(histories[0]);
          return;
        }

        // ALL: sum by month
        const sumMap = new Map();
        histories.forEach((hist) => {
          hist.forEach((p) => {
            const key = p.month;
            const prev = sumMap.get(key) || { month: key, subscribers: 0, predicted: 0 };
            sumMap.set(key, {
              month: key,
              subscribers: (prev.subscribers || 0) + (p.subscribers || 0),
              predicted: (prev.predicted || 0) + (p.predicted || 0),
            });
          });
        });

        const merged = Array.from(sumMap.values()).sort((a, b) => a.month.localeCompare(b.month));
        setSubscriberHistory(merged);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load predictive analysis");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [selectedKey, user]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Campaign Forecasting</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Subscriber growth is estimated from video publish timeline + engagement, and forecasted using a simple linear trend.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* Selector */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Selected</p>
            <p className="text-xs text-slate-500 mt-1">{selectedOption?.label || "All channels (sum)"}</p>
          </div>

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </section>

        {/* Chart */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          {loading ? (
            <p className="text-slate-600">Loading forecast...</p>
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : subscriberHistory.length === 0 ? (
            <p className="text-slate-600">No data</p>
          ) : (
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={subscriberHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="subscribers" name="Historical Subscribers" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="predicted" name="Predicted Trend" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
