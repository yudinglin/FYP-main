from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.UserAccount import UserAccount

profile_bp = Blueprint("profile", __name__, url_prefix="/api")


@profile_bp.get("/profile")
@jwt_required()
def get_profile_route():
    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@profile_bp.put("/profile")
@jwt_required()
def update_profile_route():
    data = request.get_json() or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()

    if not first_name or not last_name:
        return jsonify({"message": "First name and last name are required"}), 400

    email = get_jwt_identity()
    updated_user = UserAccount.update_name(email, first_name, last_name)
    if not updated_user:
        return jsonify({"message": "Update failed"}), 400

    return jsonify({"user": updated_user.to_dict()}), 200


@profile_bp.put("/profile/youtube-channels")
@jwt_required()
def save_youtube_channels_route():
    data = request.get_json() or {}
    channels = data.get("channels") or []
    if not isinstance(channels, list):
        return jsonify({"message": "channels must be a list"}), 400
    
    # ADD HERE: max 3 channels limit
    MAX_CHANNELS = 3
    if len(channels) > MAX_CHANNELS:
        return jsonify({"message": "You can link up to 3 YouTube channels only"}), 400

    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)
    if not user:
        return jsonify({"message": "User not found"}), 404

    # Normalized input
    cleaned = []
    for i, ch in enumerate(channels):
        if not isinstance(ch, dict):
            continue
        url = (ch.get("url") or "").strip()
        if not url:
            continue
        name = (ch.get("name") or f"Channel {i+1}").strip()
        cleaned.append({"url": url, "name": name})

    UserAccount.save_youtube_channels(owner_user_id=user.user_id, channels=cleaned)

    # Return to the latest user (including youtube_channels)
    fresh = UserAccount.find_by_email(email)
    return jsonify({"user": fresh.to_dict()}), 200
