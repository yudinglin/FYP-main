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


def classify_roles(nodes, retention_strength, discoverability_score, entry_friendliness):
    """
    Assign a primary content role to each video based on creator-friendly metrics.
    Uses plain language that creators understand immediately.
    """
    role_map = {
        "retention": "Anchor Video",      # highly connected to similar content
        "discoverability": "Explorer Video",  # helps viewers discover new topics
        "entry": "Entry Video",           # best starting point for new viewers
    }

    roles = {}
    for node in nodes:
        retention = retention_strength.get(node, 0.0)
        discoverability = discoverability_score.get(node, 0.0)
        entry = entry_friendliness.get(node, 0.0)

        scores = {"retention": retention, "discoverability": discoverability, "entry": entry}
        primary_metric = max(scores, key=lambda k: scores[k])
        primary_role = role_map[primary_metric]

        # Plain-English explanations for each role
        role_explanations = {
            "Anchor Video": {
                "description": "This video represents what your channel is all about. It's highly connected to similar content and helps build viewer loyalty.",
                "action": "Use this as your channel's signature style. Create more videos like this to strengthen your brand identity.",
                "why_matters": "Viewers who love this video will likely enjoy your other content too. It's your retention builder."
            },
            "Explorer Video": {
                "description": "This video helps viewers discover new topics on your channel. It bridges different themes and keeps people exploring.",
                "action": "Feature this in playlists and end screens. It's perfect for moving viewers from one interest to another.",
                "why_matters": "It expands your audience by connecting different viewer interests. Great for growth and discovery."
            },
            "Entry Video": {
                "description": "This is the perfect starting point for new viewers. It's easy to find and leads naturally to your other content.",
                "action": "Use this as your channel trailer, pin it, or make it the first video in your main playlist.",
                "why_matters": "First impressions matter. This video helps new viewers understand your channel and want to watch more."
            }
        }

        roles[node] = {
            "primary_role": primary_role,
            "scores": {
                "retention_strength": retention,
                "discoverability_score": discoverability,
                "entry_friendliness": entry
            },
            **role_explanations[primary_role]
        }

    return roles


def build_network_summary(node_count, edge_count):
    """
    Build a creator-friendly summary of the content network.
    Uses plain language instead of technical terms.
    """
    if node_count < 2:
        return {
            "total_videos": node_count,
            "total_connections": edge_count,
            "content_cohesion": 0.0,
            "cohesion_label": "Building",
            "cohesion_explanation": "You're just getting started! Keep creating content to see how your videos connect."
        }

    possible_edges = node_count * (node_count - 1) / 2
    density = (edge_count / possible_edges) * 100.0 if possible_edges else 0.0

    if density >= 60:
        label = "Strong"
        explanation = "Your content feels cohesive and connected. Viewers can easily find related videos they'll enjoy."
    elif density >= 30:
        label = "Moderate"
        explanation = "You balance variety with consistency. Your best videos help guide viewers to discover more."
    else:
        label = "Building"
        explanation = "Your topics are diverse. Consider creating playlists or series to help viewers navigate your content."

    return {
        "total_videos": node_count,
        "total_connections": edge_count,
        "content_cohesion": round(density, 2),
        "cohesion_label": label,
        "cohesion_explanation": explanation
    }


def generate_plain_insights(nodes, retention_strength, discoverability_score, entry_friendliness, summary, videos_map):
    """
    Generate actionable, creator-friendly insights.
    Sounds like a YouTube growth coach, not a data scientist.
    """
    insights = []

    # Add summary insight
    insights.append(summary.get("cohesion_explanation", "Your content is growing!"))

    def top_item(score_map):
        if not score_map:
            return None, 0.0
        top_node = max(score_map, key=score_map.get)
        return top_node, score_map.get(top_node, 0.0)

    top_retention, retention_val = top_item(retention_strength)
    top_discover, discover_val = top_item(discoverability_score)
    top_entry, entry_val = top_item(entry_friendliness)

    # Get video titles for better context
    def get_video_title(video_id):
        video = videos_map.get(video_id, {})
        # Try to get title from various possible fields
        title = video.get("title") or video.get("snippet", {}).get("title") or f"your video"
        return title

    if top_retention and retention_val > 50:
        title = get_video_title(top_retention)
        insights.append(
            f"🎯 Your best retention builder: '{title}'. This video keeps viewers watching more of your content. Create similar videos to build a loyal audience."
        )
    
    if top_discover and discover_val > 50:
        title = get_video_title(top_discover)
        insights.append(
            f"🔍 Your best discovery video: '{title}'. This helps viewers explore different topics on your channel. Add it to playlists and end screens to grow your reach."
        )
    
    if top_entry and entry_val > 50:
        title = get_video_title(top_entry)
        insights.append(
            f"Your best entry point: '{title}'. Perfect for new viewers! Consider making this your channel trailer or pinning it to help first-time visitors understand your channel."
        )

    # Overall growth advice
    if retention_val < 30 and discover_val < 30 and entry_val < 30:
        insights.append(
            "Keep creating! As you publish more videos and build connections between them, you'll discover which content works best for retention, discovery, and attracting new viewers."
        )
    elif summary.get("cohesion_label") == "Strong":
        insights.append(
            "Your content strategy is working! Your videos connect well, which means viewers can easily find more content they'll love. Keep this momentum going."
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
                "scores": {
                    "retention_strength": {},
                    "discoverability_score": {},
                    "entry_friendliness": {},
                    "content_influence": {},
                },
                "roles": {},
                "summary": {
                    "total_videos": len(videos),
                    "total_connections": 0,
                    "content_cohesion": 0.0,
                    "cohesion_label": "Building",
                    "cohesion_explanation": "You're just getting started! Keep creating content to see how your videos connect."
                },
                "insights": [
                    "📹 Keep creating! We need at least two videos to analyze how your content connects and identify your best-performing videos."
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

        # Convert to creator-friendly metric names
        # Retention Strength = how well this video connects to similar content (degree)
        # Discoverability Score = how well this video bridges different topics (betweenness)
        # Entry Friendliness = how easy it is to reach from anywhere (closeness)
        retention_strength = normalize_scores(degree)
        discoverability_score = normalize_scores(betweenness)
        entry_friendliness = normalize_scores(closeness)

        # Build videos map for insights
        videos_map = {v["id"]: v for v in videos}

        roles = classify_roles(
            list(G.nodes()),
            retention_strength,
            discoverability_score,
            entry_friendliness,
        )

        summary = build_network_summary(len(G.nodes()), edge_count)
        insights = generate_plain_insights(
            list(G.nodes()),
            retention_strength,
            discoverability_score,
            entry_friendliness,
            summary,
            videos_map,
        )

        # Calculate Content Influence (combination metric for overall importance)
        content_influence = {}
        for node in G.nodes():
            influence = (
                retention_strength.get(node, 0) * 0.4 +
                discoverability_score.get(node, 0) * 0.3 +
                entry_friendliness.get(node, 0) * 0.3
            )
            content_influence[node] = round(influence, 2)

        return jsonify({
            "nodes": list(G.nodes()),
            "edges": [
                {"source": u, "target": v, "weight": d["weight"]} 
                for u, v, d in G.edges(data=True)
            ],
            # Keep raw centrality for technical/advanced view if needed
            "centrality": {
                "degree": degree,
                "betweenness": betweenness,
                "closeness": closeness,
            },
            # Creator-friendly scores (0-100)
            "scores": {
                "retention_strength": retention_strength,
                "discoverability_score": discoverability_score,
                "entry_friendliness": entry_friendliness,
                "content_influence": content_influence,
            },
            "roles": roles,
            "summary": summary,
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