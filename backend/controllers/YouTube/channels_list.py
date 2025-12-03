
from flask import Blueprint, request, jsonify
from .youtube_utils import extract_channel_id, fetch_basic_channel_stats

channels_bp = Blueprint("channels_list", __name__, url_prefix="/api/youtube")


@channels_bp.route("/channels.list", methods=["GET"])
def channels_list():
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL"}), 400

    basic = fetch_basic_channel_stats(channel_id)
    if not basic:
        return jsonify({"error": "Channel not found"}), 404

    return jsonify({
        "subscriberCount": basic["subscriberCount"],
        "viewCount": basic["viewCount"],
    }), 200
