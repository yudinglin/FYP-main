from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.UserAccount import UserAccount
from controllers.Shared.profile_controller import (
    get_profile,
    update_profile,
    get_subscription_info,
    update_subscription,
    cancel_subscription
)


profile_bp = Blueprint("profile", __name__, url_prefix="/api")

# -------------------------------------------------------------------------
# GET PROFILE
# -------------------------------------------------------------------------
@profile_bp.get("/profile")
@jwt_required()
def get_profile_route():
    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200


# -------------------------------------------------------------------------
# UPDATE BASIC PROFILE
# -------------------------------------------------------------------------
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


# -------------------------------------------------------------------------
# SAVE YOUTUBE CHANNELS (CREATOR + BUSINESS)
# -------------------------------------------------------------------------
@profile_bp.put("/profile/youtube-channels")
@jwt_required()
def save_youtube_channels_route():
    data = request.get_json() or {}
    channels = data.get("channels") or []

    if not isinstance(channels, list):
        return jsonify({"message": "channels must be a list"}), 400

    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)

    if not user:
        return jsonify({"message": "User not found"}), 404

    # -----------------------------
    # Role-based limits
    # -----------------------------
    MAX_CHANNELS = 1 if user.role == "creator" else 5

    if len(channels) > MAX_CHANNELS:
        return jsonify({
            "message": f"You can link up to {MAX_CHANNELS} YouTube channel(s) only"
        }), 400

    # -----------------------------
    # Normalize & validate input
    # -----------------------------
    cleaned = []
    for idx, ch in enumerate(channels):
        if not isinstance(ch, dict):
            continue

        url = (ch.get("url") or "").strip()
        if not url:
            continue

        name = (ch.get("name") or f"Channel {idx + 1}").strip()

        cleaned.append({
            "url": url,
            "name": name
        })

    # Enforce role limit again (safety)
    cleaned = cleaned[:MAX_CHANNELS]

    # -----------------------------
    # Persist
    # -----------------------------
    UserAccount.save_youtube_channels(
        owner_user_id=user.user_id,
        channels=cleaned
    )

    # Reload fresh user data
    fresh_user = UserAccount.find_by_email(email)
    return jsonify({"user": fresh_user.to_dict()}), 200


# -------------------------------------------------------------------------
# GET SUBSCRIPTION INFO
# -------------------------------------------------------------------------
@profile_bp.get("/profile/subscription")
@jwt_required()
def get_subscription_route():
    response, status = get_subscription_info()
    return jsonify(response), status


# -------------------------------------------------------------------------
# UPDATE SUBSCRIPTION PLAN
# -------------------------------------------------------------------------
@profile_bp.put("/profile/subscription")
@jwt_required()
def update_subscription_route():
    data = request.get_json() or {}
    plan_name = data.get("plan_name")

    if not plan_name:
        return jsonify({"message": "plan_name is required"}), 400

    response, status = update_subscription(plan_name)
    return jsonify(response), status


# -------------------------------------------------------------------------
# CANCEL SUBSCRIPTION
# -------------------------------------------------------------------------
@profile_bp.delete("/profile/subscription")
@jwt_required()
def cancel_subscription_route():
    response, status = cancel_subscription()
    return jsonify(response), status
