from flask import Blueprint, request, jsonify
from controllers.Shared.login_controller import login_user

login_bp = Blueprint('login_bp', __name__)

@login_bp.route('/api/login', methods=['POST'])
def login():
    response, status = login_user(request)
    return jsonify(response), status