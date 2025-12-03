# likes / comments

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
)
import requests
import os

API_KEY = os.getenv("YOUTUBE_API_KEY")

videos_bp = Blueprint("videos_list", __name__, url_prefix="/api/youtube")


@videos_bp.route("/videos.list", methods=["GET"])
def videos_list():
    url_or_id = request.args.get("url")
    max_videos = int(request.args.get("maxResults", 50))

    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    basic = fetch_basic_channel_stats(channel_id)

    playlist_id = basic["uploadsPlaylistId"]

    video_ids = fetch_video_ids(playlist_id, max_videos)
    if not video_ids:
        return jsonify({"totalLikes": 0, "totalComments": 0}), 200

    yt_url = "https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "statistics",
        "id": ",".join(video_ids),
        "key": API_KEY,
    }

    resp = requests.get(yt_url, params=params, timeout=10)
    resp.raise_for_status()

    data = resp.json()

    total_likes = 0
    total_comments = 0

    for item in data.get("items", []):
        st = item.get("statistics", {})
        total_likes += int(st.get("likeCount", 0))
        total_comments += int(st.get("commentCount", 0))

    return jsonify({
        "totalLikes": total_likes,
        "totalComments": total_comments,
    }), 200
