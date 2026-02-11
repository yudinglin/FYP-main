from flask import Blueprint, jsonify
from controllers.Admin.user_controller import get_all_users
from utils.auth import require_admin

user_bp = Blueprint("user_bp", __name__)

@user_bp.get("/users")
@require_admin
def users():
    user_list = get_all_users()
    return jsonify(user_list)
