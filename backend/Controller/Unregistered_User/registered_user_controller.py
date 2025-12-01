from flask import Blueprint, request, jsonify
from Entity.UserAccount import UserAccount
from db import get_connection

register_bp = Blueprint('register_bp', __name__)


@register_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}

    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    role = data.get('role')

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    if not first_name or not last_name:
        return jsonify({"message": "First and last name required"}), 400

    enum_role = {
        "creator": "creator",
        "business": "business",
        "admin": "admin",
    }.get(role, "creator")


    if UserAccount.find_by_email(email):
        return jsonify({"message": "Email already registered"}), 409


    UserAccount.create_user(email, password, first_name, last_name, enum_role)

    return jsonify({"message": "Registered successfully"}), 201
