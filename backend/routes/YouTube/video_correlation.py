# backend/routes/YouTube/video_correlation.py

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
)
import pandas as pd
import networkx as nx
from networkx.algorithms import community

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
        threshold = float(request.args.get("threshold", "0.70"))
    except ValueError:
        threshold = 0.70

    try:
        max_videos = int(request.args.get("maxVideos", "25"))
        max_videos = min(max_videos, 500)
    except ValueError:
        max_videos = 25

    basic = fetch_basic_channel_stats(channel_id)
    if not basic:
        return jsonify({"error": "Channel not found"}), 404

    playlist_id = basic["uploadsPlaylistId"]
    video_ids = fetch_video_ids(playlist_id, max_videos)
    if not video_ids:
        return jsonify({"nodes": [], "edges": [], "rawMetrics": [], "communities": []}), 200

    videos = fetch_video_stats(video_ids, with_snippet=True)

    df = pd.DataFrame(videos)
    if df.shape[0] < 2:
        return jsonify({
            "nodes": df.to_dict(orient="records"),
            "edges": [],
            "rawMetrics": df[["id", "title", "views", "likes", "comments", "thumbnail"]].to_dict(orient="records"),
            "communities": []
        }), 200

    metric_cols = ["views", "likes", "comments"]
    df[metric_cols] = df[metric_cols].astype(float)

    df_metrics = df[metric_cols]
    corr_matrix = df_metrics.T.corr(method="pearson")

    # Build edges
    n = df.shape[0]
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            r = corr_matrix.iat[i, j]
            if pd.isna(r):
                continue
            if r >= threshold:
                edges.append({
                    "source": df.iloc[i]["id"],
                    "target": df.iloc[j]["id"],
                    "weight": round(float(r), 3),
                })

    # Create NetworkX graph for community detection
    G = nx.Graph()
    
    # Add all nodes first
    for _, row in df.iterrows():
        G.add_node(row["id"])
    
    # Add edges
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], weight=edge["weight"])

    # Community detection using Louvain algorithm
    communities_dict = {}
    bridge_nodes = set()
    
    if len(edges) > 0:
        # Detect communities
        communities = community.greedy_modularity_communities(G, weight='weight')
        
        # Map node to community
        for comm_id, comm in enumerate(communities):
            for node in comm:
                communities_dict[node] = comm_id
        
        # Calculate betweenness centrality to find bridge nodes
        if G.number_of_nodes() > 2:
            betweenness = nx.betweenness_centrality(G, weight='weight')
            # Top 10% nodes by betweenness are considered bridges
            threshold_betweenness = sorted(betweenness.values(), reverse=True)[min(len(betweenness)//10, len(betweenness)-1)]
            bridge_nodes = {node for node, val in betweenness.items() if val >= threshold_betweenness and val > 0}
    else:
        # No edges, each node is its own community
        for idx, row in df.iterrows():
            communities_dict[row["id"]] = idx

    # Calculate z-scores
    df["views_zscore"] = (
        (df["views"] - df["views"].mean())
        / (df["views"].std(ddof=0) + 1e-9)
    )

    # Add community and bridge info to nodes
    df["community"] = df["id"].map(communities_dict).fillna(0).astype(int)
    df["isBridge"] = df["id"].apply(lambda x: x in bridge_nodes)

    # Prepare nodes
    nodes = df[
        ["id", "title", "publishedAt", "views", "likes", "comments", 
         "views_zscore", "thumbnail", "community", "isBridge"]
    ].to_dict(orient="records")

    # Prepare rawMetrics
    rawMetrics = df[
        ["id", "title", "views", "likes", "comments", "thumbnail", "publishedAt"]
    ].to_dict(orient="records")

    # Community summary
    community_summary = []
    for comm_id in df["community"].unique():
        comm_nodes = df[df["community"] == comm_id]
        community_summary.append({
            "id": int(comm_id),
            "size": len(comm_nodes),
            "avgViews": float(comm_nodes["views"].mean()),
            "videos": comm_nodes["id"].tolist()
        })

    return jsonify({
        "nodes": nodes,
        "edges": edges,
        "rawMetrics": rawMetrics,
        "communities": community_summary
    }), 200