from flask import Blueprint, jsonify
from controllers.Admin.user_controller import get_all_users

user_bp = Blueprint("user_bp", __name__)

@user_bp.get("/users")
def users():
    user_list = get_all_users()
    return jsonify(user_list)
