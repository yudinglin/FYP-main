# backend/routes/YouTube/video_correlation.py

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
)
import pandas as pd

video_corr_bp = Blueprint("video_correlation", __name__, url_prefix="/api/youtube")


@video_corr_bp.route("/videos.correlationNetwork", methods=["GET"])
def video_correlation_network():
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    try:
        threshold = float(request.args.get("threshold", "0.7"))
    except ValueError:
        threshold = 0.7

    try:
        max_videos = int(request.args.get("maxVideos", "10"))
    except ValueError:
        max_videos = 200

    basic = fetch_basic_channel_stats(channel_id)
    if not basic:
        return jsonify({"error": "Channel not found"}), 404

    playlist_id = basic["uploadsPlaylistId"]
    video_ids = fetch_video_ids(playlist_id, max_videos)
    if not video_ids:
        return jsonify({"nodes": [], "edges": []}), 200

    # take snippet + statistics
    videos = fetch_video_stats(video_ids, with_snippet=True)

    # ---- pandas analysis(remeber to install pandas) ----
    df = pd.DataFrame(videos)
    if df.shape[0] < 2:
        return jsonify({"nodes": df.to_dict(orient="records"), "edges": []}), 200

    metric_cols = ["views", "likes", "comments"]
    df[metric_cols] = df[metric_cols].astype(float)

    df_metrics = df[metric_cols]
    corr_matrix = df_metrics.T.corr(method="pearson")

    n = df.shape[0]
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            r = corr_matrix.iat[i, j]
            if pd.isna(r):
                continue
            if r >= threshold:
                edges.append(
                    {
                        "source": df.iloc[i]["id"],
                        "target": df.iloc[j]["id"],
                        "weight": round(float(r), 3),
                    }
                )

    df["views_zscore"] = (
        (df["views"] - df["views"].mean())
        / (df["views"].std(ddof=0) + 1e-9)
    )

    nodes = df[
        ["id", "title", "publishedAt", "views", "likes", "comments", "views_zscore"]
    ].to_dict(orient="records")

    return jsonify({
        "nodes": nodes,
        "edges": edges,
        "rawMetrics": df[
            ["id","title","views","likes","comments","publishedAt","thumbnail"]
        ].to_dict(orient="records")

    }), 200

@video_corr_bp.route("/videos.similarityNetwork", methods=["GET"])
def video_similarity_network():
    """Build a *star* network: one center video + top-K similar videos."""
    url_or_id = request.args.get("url")
    center_video_id = request.args.get("videoId")

    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400
    if not center_video_id:
        return jsonify({"error": "Missing videoId"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    # --- params ---
    try:
        top_k = int(request.args.get("topK", "25"))
    except ValueError:
        top_k = 25
    top_k = max(1, min(top_k, 200))

    try:
        pool_max = int(request.args.get("poolMax", "300"))
    except ValueError:
        pool_max = 300
    # set to low one local can run 2000 but web cannot run
    pool_max = max(2, min(pool_max, 800))

    try:
        threshold = float(request.args.get("threshold", "-1"))
    except ValueError:
        threshold = -1

    basic = fetch_basic_channel_stats(channel_id)
    if not basic:
        return jsonify({"error": "Channel not found"}), 404

    playlist_id = basic["uploadsPlaylistId"]
    video_ids = fetch_video_ids(playlist_id, pool_max)
    if not video_ids:
        return jsonify({"nodes": [], "edges": [], "rawMetrics": []}), 200

    # ensure center included + unique + keep size bounded
    if center_video_id not in video_ids:
        video_ids = [center_video_id] + video_ids
    # Remove duplicates while maintaining order
    seen = set()
    video_ids = [x for x in video_ids if x and (x not in seen and not seen.add(x))]
    video_ids = video_ids[: pool_max + 1]

    videos = fetch_video_stats(video_ids, with_snippet=True)
    df = pd.DataFrame(videos)
    if df.empty:
        return jsonify({"nodes": [], "edges": [], "rawMetrics": []}), 200

    metric_cols = ["views", "likes", "comments"]

    # --- key fix: tolerate missing/dirty numeric fields ---
    for c in metric_cols:
        df[c] = pd.to_numeric(df.get(c), errors="coerce").fillna(0.0)

    center_rows = df[df["id"] == center_video_id]
    if center_rows.empty:
        return jsonify({"error": "Center video not found in fetched data"}), 404

    center_vec = center_rows.iloc[0][metric_cols]

    # --- vectorized similarity (much faster than iterrows loop) ---
    df_metrics = df[metric_cols]
    sim = df_metrics.corrwith(center_vec, axis=1, method="pearson").fillna(-9999.0)

    # drop center itself
    sim[df["id"] == center_video_id] = -9999.0

    if threshold >= 0:
        sim = sim.where(sim >= threshold, other=-9999.0)

    # pick topK
    top_idx = sim.nlargest(top_k).index
    top_pairs = [(df.loc[i, "id"], float(sim.loc[i])) for i in top_idx if sim.loc[i] > -9999.0]

    top_ids = [center_video_id] + [vid for vid, _ in top_pairs]
    df_sub = df[df["id"].isin(top_ids)].copy()
    df_sub["isCenter"] = df_sub["id"] == center_video_id

    edges = [
        {"source": center_video_id, "target": vid, "weight": round(w, 3)}
        for vid, w in top_pairs
    ]

    nodes = df_sub[
        ["id", "title", "publishedAt", "views", "likes", "comments", "thumbnail", "isCenter"]
    ].to_dict(orient="records")

    return jsonify({
        "nodes": nodes,
        "edges": edges,
        "rawMetrics": df_sub[
            ["id", "title", "views", "likes", "comments", "publishedAt", "thumbnail", "isCenter"]
        ].to_dict(orient="records"),
    }), 200
