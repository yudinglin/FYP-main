# routes/profile_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from controllers.Shared.profile_controller import get_profile, update_profile

profile_bp = Blueprint("profile", __name__, url_prefix="/api")

@profile_bp.get("/profile")
@jwt_required()
def get_profile_route():
    user = get_profile()
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200

@profile_bp.put("/profile")
@jwt_required()
def update_profile_route():
    data = request.get_json()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()

    if not first_name or not last_name:
        return jsonify({"message": "First name and last name are required"}), 400

    updated_user = update_profile(first_name, last_name)
    if not updated_user:
        return jsonify({"message": "Update failed"}), 400

    return jsonify({"user": updated_user.to_dict()}), 200