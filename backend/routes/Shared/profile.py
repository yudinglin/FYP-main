from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.UserAccount import UserAccount

profile_bp = Blueprint("profile", __name__, url_prefix="/api")

# get user data
@profile_bp.get("/profile")
@jwt_required()
def get_profile():
    email_from_token = get_jwt_identity()
    user = UserAccount.find_by_email(email_from_token)
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200


# update（first_name / last_name）
@profile_bp.put("/profile")
@jwt_required()
def update_profile():
    email = get_jwt_identity()
    data = request.get_json()

    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()

    if not first_name or not last_name:
        return jsonify({"message": "First name and last name are required"}), 400

    updated = UserAccount.update_name(email, first_name, last_name)
    if not updated:
        return jsonify({"message": "Update failed"}), 400

    user = UserAccount.find_by_email(email)
    return jsonify({"user": user.to_dict()}), 200
