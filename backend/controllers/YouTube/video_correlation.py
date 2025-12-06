# backend/Controller/YouTube/video_correlation.py

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

    return jsonify({"nodes": nodes, "edges": edges}), 200
