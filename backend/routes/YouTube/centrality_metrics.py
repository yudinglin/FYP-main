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


def normalize_scores(raw_scores):
    """
    Scale a dict of centrality scores to 0-100.
    Keeps keys intact and avoids division by zero.
    """
    if not raw_scores:
        return {}

    values = list(raw_scores.values())
    max_v = max(values)
    min_v = min(values)

    if max_v == min_v:
        # If every value is identical, map to 100 when non-zero, else 0
        base = 100.0 if max_v > 0 else 0.0
        return {k: round(base, 2) for k in raw_scores}

    scale = max_v - min_v
    return {k: round(((v - min_v) / scale) * 100.0, 2) for k, v in raw_scores.items()}


def classify_roles(nodes, normalized_degree, normalized_betweenness, normalized_closeness):
    """
    Assign a primary content role to each video based on the strongest
    normalized centrality dimension.
    """
    role_map = {
        "degree": "Pillar Content",        # highly connected to many videos
        "betweenness": "Bridge Content",   # links otherwise separate groups
        "closeness": "Core Content",       # quickly reaches the rest of the catalog
    }

    roles = {}
    for node in nodes:
        deg = normalized_degree.get(node, 0.0)
        bet = normalized_betweenness.get(node, 0.0)
        clo = normalized_closeness.get(node, 0.0)

        scores = {"degree": deg, "betweenness": bet, "closeness": clo}
        primary_metric = max(scores, key=lambda k: scores[k])
        primary_role = role_map[primary_metric]

        roles[node] = {
            "primary_role": primary_role,
            "scores": scores,
            "description": {
                "Pillar Content": "Highly connected videos that anchor your channel identity.",
                "Bridge Content": "Discovery-friendly videos that help viewers jump between topics.",
                "Core Content": "Videos close to everything else — great entry points for new viewers.",
            }[primary_role],
        }

    return roles


def build_network_summary(node_count, edge_count):
    if node_count < 2:
        return {
            "total_videos": node_count,
            "total_connections": edge_count,
            "density_score": 0.0,
            "consistency_label": "Weak",
        }

    possible_edges = node_count * (node_count - 1) / 2
    density = (edge_count / possible_edges) * 100.0 if possible_edges else 0.0

    if density >= 60:
        label = "Strong"
    elif density >= 30:
        label = "Moderate"
    else:
        label = "Weak"

    return {
        "total_videos": node_count,
        "total_connections": edge_count,
        "density_score": round(density, 2),
        "consistency_label": label,
    }


def generate_plain_insights(nodes, normalized_degree, normalized_betweenness, normalized_closeness, summary):
    """Return plain-English insights without exposing math terms."""
    insights = []

    if summary["consistency_label"] == "Strong":
        insights.append(
            "Your catalog feels cohesive. New viewers will quickly find similar videos they enjoy."
        )
    elif summary["consistency_label"] == "Moderate":
        insights.append(
            "You balance variety with familiarity. Highlight the most connected videos to guide new viewers."
        )
    else:
        insights.append(
            "Your topics are spread out. Create mini-series or playlists to help viewers navigate."
        )

    def top_item(score_map):
        if not score_map:
            return None, 0.0
        top_node = max(score_map, key=score_map.get)
        return top_node, score_map.get(top_node, 0.0)

    top_deg, deg_score = top_item(normalized_degree)
    top_bet, bet_score = top_item(normalized_betweenness)
    top_clo, clo_score = top_item(normalized_closeness)

    if top_deg:
        insights.append(
            f"Video {top_deg} is highly connected to others—use it to introduce new viewers to your channel style."
        )
    if top_bet:
        insights.append(
            f"Video {top_bet} bridges different topics—feature it in playlists to move viewers across themes."
        )
    if top_clo:
        insights.append(
            f"Video {top_clo} sits close to everything else—pin it or add it to end screens as a go-to starting point."
        )

    if deg_score < 30 and bet_score < 30 and clo_score < 30:
        insights.append(
            "No single standout video yet. Keep publishing and interlinking to reveal your anchors and bridges."
        )

    return insights


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
                },
                "normalized_scores": {
                    "degree": {},
                    "betweenness": {},
                    "closeness": {},
                },
                "roles": {},
                "network_summary": {
                    "total_videos": len(videos),
                    "total_connections": 0,
                    "density_score": 0.0,
                    "consistency_label": "Weak",
                },
                "insights": [
                    "We need at least two videos with comparable performance to map how your content connects."
                ],
                "metadata": {
                    "threshold": None,
                    "edge_count": 0,
                    "has_network": False
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

        # Step 4: Compute centrality scores using academically-correct definitions
        if edge_count > 0 and len(G.nodes()) > 1:
            degree = nx.degree_centrality(G)
            betweenness = nx.betweenness_centrality(G, normalized=True)
            # wf_improved accounts for disconnected components without overstating closeness
            closeness = nx.closeness_centrality(G, wf_improved=True)
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

        normalized_degree = normalize_scores(degree)
        normalized_betweenness = normalize_scores(betweenness)
        normalized_closeness = normalize_scores(closeness)

        roles = classify_roles(
            list(G.nodes()),
            normalized_degree,
            normalized_betweenness,
            normalized_closeness,
        )

        summary = build_network_summary(len(G.nodes()), edge_count)
        insights = generate_plain_insights(
            list(G.nodes()),
            normalized_degree,
            normalized_betweenness,
            normalized_closeness,
            summary,
        )

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
            "normalized_scores": {
                "degree": normalized_degree,
                "betweenness": normalized_betweenness,
                "closeness": normalized_closeness,
            },
            "roles": roles,
            "network_summary": summary,
            "insights": insights,
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