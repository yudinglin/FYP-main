# backend/Controller/YouTube/videos_list.py

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
)

videos_bp = Blueprint("videos_list", __name__, url_prefix="/api/youtube")


@videos_bp.route("/videos.list", methods=["GET"])
def videos_list():
    url_or_id = request.args.get("url")
    max_videos = int(request.args.get("maxResults", 50))

    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL"}), 400

    basic = fetch_basic_channel_stats(channel_id)
    if not basic:
        return jsonify({"error": "Channel not found"}), 404

    playlist_id = basic["uploadsPlaylistId"]

    video_ids = fetch_video_ids(playlist_id, max_videos)
    if not video_ids:
        return jsonify({"totalLikes": 0, "totalComments": 0}), 200

    # // main change use utils all the fuction that get data from api put in the youtube_utils.py
    videos = fetch_video_stats(video_ids, with_snippet=False)

    total_likes = sum(v["likes"] for v in videos)
    total_comments = sum(v["comments"] for v in videos)

    return jsonify({
        "totalLikes": total_likes,
        "totalComments": total_comments,
    }), 200

