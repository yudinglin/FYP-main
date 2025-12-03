from flask import Blueprint, request, jsonify
from controllers.Unregistered_User.register_controller import register_user

register_bp = Blueprint('register_bp', __name__)

@register_bp.route('/api/register', methods=['POST'])
def register():
    response, status = register_user(request)
    return jsonify(response), status
