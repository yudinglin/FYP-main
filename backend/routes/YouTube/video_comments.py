from flask import Blueprint, request, jsonify
from ..utils.youtube_utils import extract_channel_id, youtube_get, fetch_basic_channel_stats

comments_bp = Blueprint("video_comments", __name__, url_prefix="/api/youtube")

@comments_bp.route("/videos.latestComments", methods=["GET"])
def latest_comments():
    url_or_id = request.args.get("url")
    max_comments = int(request.args.get("maxResults", 20))

    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    # Get uploads playlist
    basic = fetch_basic_channel_stats(channel_id)
    uploads = basic["uploadsPlaylistId"]

    # Get the most recent 10 uploaded videos
    pl = youtube_get("playlistItems", {
        "part": "contentDetails",
        "playlistId": uploads,
        "maxResults": 10
    })

    video_ids = [
        i["contentDetails"]["videoId"]
        for i in pl.get("items", [])
    ]

    if not video_ids:
        return jsonify({"comments": []}), 200

    all_comments = []

    for vid in video_ids:
        data = youtube_get("commentThreads", {
            "part": "snippet",
            "videoId": vid,
            "maxResults": 5,
            "order": "time"
        })

        for item in data.get("items", []):
            top = item["snippet"]["topLevelComment"]["snippet"]
            all_comments.append({
                "videoId": vid,
                "author": top.get("authorDisplayName"),
                "text": top.get("textDisplay"),
                "publishedAt": top.get("publishedAt"),
                "likeCount": top.get("likeCount")
            })

    # Sort comments by newest
    all_comments = sorted(all_comments, key=lambda x: x["publishedAt"], reverse=True)

    return jsonify({
        "comments": all_comments[:max_comments]
    }), 200
