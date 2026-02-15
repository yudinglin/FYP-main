from flask import Blueprint, request, jsonify
from utils.youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
)
import numpy as np

subscriber_predict_bp = Blueprint(
    "subscriber_prediction", __name__, url_prefix="/api/youtube"
)


@subscriber_predict_bp.route("/channels.predictSubscribers", methods=["GET"])
def predict_subscribers():
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL"}), 400

    basic = fetch_basic_channel_stats(channel_id)
    if not basic:
        return jsonify({"error": "Channel not found"}), 404

    subs = basic["subscriberCount"]

    # recent videos
    playlist_id = basic["uploadsPlaylistId"]
    video_ids = fetch_video_ids(playlist_id, 20)
    videos = fetch_video_stats(video_ids, with_snippet=False)

    if not videos:
        return jsonify({
            "currentSubscribers": subs,
            "monthlyGrowthRate": 0,
            "prediction": {}
        })

    avg_views = np.mean([v["views"] for v in videos])
    avg_likes = np.mean([v["likes"] for v in videos])
    avg_comments = np.mean([v["comments"] for v in videos])

    # ---- Heuristic growth formula ----
    engagement_score = (
        avg_views * 0.6 +
        avg_likes * 0.3 +
        avg_comments * 0.1
    )

    # growth % per month (capped for realism)
    monthly_growth_rate = min(0.15, engagement_score / max(subs, 1))

    def project(months):
        return int(subs * ((1 + monthly_growth_rate) ** months))

    return jsonify({
        "currentSubscribers": subs,
        "monthlyGrowthRate": round(monthly_growth_rate * 100, 2),
        "prediction": {
            "3_months": project(3),
            "6_months": project(6),
            "12_months": project(12),
        },
        "inputs": {
            "avgViews": int(avg_views),
            "avgLikes": int(avg_likes),
            "avgComments": int(avg_comments),
        }
    }), 200
