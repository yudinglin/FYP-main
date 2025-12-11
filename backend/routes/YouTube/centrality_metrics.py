# backend/routes/YouTube/video_centrality.py

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats
)
import pandas as pd
import networkx as nx

centrality_bp = Blueprint("video_centrality", __name__, url_prefix="/api/youtube")


@centrality_bp.route("/videos.centralityMetrics", methods=["GET"])
def centrality_metrics():
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    try:
        # Step 1: load videos
        basic = fetch_basic_channel_stats(channel_id)
        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, 50)

        videos = fetch_video_stats(video_ids, with_snippet=False)

        if len(videos) < 2:
            return jsonify({
                "nodes": [], 
                "edges": [],
                "centrality": {
                    "degree": {},
                    "betweenness": {},
                    "closeness": {}
                }
            })

        # Step 2: build corr matrix
        df = pd.DataFrame(videos)
        metric_cols = ["views", "likes", "comments"]
        df[metric_cols] = df[metric_cols].astype(float)

        # Normalize metrics to 0-1 scale for better correlation
        for col in metric_cols:
            min_val = df[col].min()
            max_val = df[col].max()
            if max_val > min_val:
                df[f"{col}_norm"] = (df[col] - min_val) / (max_val - min_val)
            else:
                df[f"{col}_norm"] = 0.0

        # Compute correlation on normalized data
        norm_cols = [f"{col}_norm" for col in metric_cols]
        corr = df[norm_cols].T.corr()

        # Step 3: Build graph with LOWER threshold for more connections
        G = nx.Graph()

        # Add nodes with attributes
        for v in videos:
            G.add_node(
                v["id"], 
                views=float(v["views"]), 
                likes=float(v["likes"]),
                comments=float(v["comments"])
            )

        # LOWER threshold: 0.5 instead of 0.7 to create more edges
        threshold = 0.5
        edge_count = 0
        for i in range(len(df)):
            for j in range(i + 1, len(df)):
                r = corr.iat[i, j]
                if pd.notna(r) and r >= threshold:
                    G.add_edge(df.iloc[i]["id"], df.iloc[j]["id"], weight=float(r))
                    edge_count += 1

        # Step 4: Compute centrality scores
        if edge_count > 0 and len(G.nodes()) > 1:
            degree = nx.degree_centrality(G)
            betweenness = nx.betweenness_centrality(G, normalized=True)
            
            # For closeness, handle disconnected components
            closeness = {}
            for component in nx.connected_components(G):
                subgraph = G.subgraph(component)
                component_closeness = nx.closeness_centrality(subgraph)
                closeness.update(component_closeness)
            
            # Fill in any missing nodes with 0
            for node in G.nodes():
                if node not in closeness:
                    closeness[node] = 0.0
        else:
            # FALLBACK: Use engagement-based scoring when no network exists
            degree = {}
            betweenness = {}
            closeness = {}
            
            for v in videos:
                vid = v["id"]
                views = float(v["views"]) or 1
                likes = float(v["likes"]) or 0
                comments = float(v["comments"]) or 0
                
                # Degree: based on raw engagement (likes + comments)
                degree[vid] = (likes + comments) / 1000.0  # normalize
                
                # Betweenness: based on engagement rate
                betweenness[vid] = (likes + comments) / views
                
                # Closeness: based on view count (popular = more "central")
                closeness[vid] = views / 1000000.0  # normalize

            # Normalize to 0-1 range
            if degree:
                max_deg = max(degree.values()) or 1
                degree = {k: v/max_deg for k, v in degree.items()}
            
            if betweenness:
                max_bet = max(betweenness.values()) or 1
                betweenness = {k: v/max_bet for k, v in betweenness.items()}
            
            if closeness:
                max_clo = max(closeness.values()) or 1
                closeness = {k: v/max_clo for k, v in closeness.items()}

        return jsonify({
            "nodes": list(G.nodes()),
            "edges": [
                {"source": u, "target": v, "weight": d["weight"]} 
                for u, v, d in G.edges(data=True)
            ],
            "centrality": {
                "degree": degree,
                "betweenness": betweenness,
                "closeness": closeness,
            },
            "metadata": {
                "threshold": threshold,
                "edge_count": edge_count,
                "has_network": edge_count > 0
            }
        })

    except Exception as e:
        import traceback
        print("Error in centrality_metrics:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500