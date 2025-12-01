from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models.UserAccount import UserAccount

login_bp = Blueprint('login_bp', __name__)


@login_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = UserAccount.find_by_email(email)

    if not user:
        return jsonify({"message": "Invalid email or password"}), 401

    if user.status != "ACTIVE":
        return jsonify({"message": "Account is not active"}), 403

    if not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = create_access_token(identity=user.email)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200
