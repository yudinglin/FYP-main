from flask import Blueprint, request, jsonify
from controllers.Shared.support_controller import submit_ticket

support_bp = Blueprint("support_bp", __name__, url_prefix="/api")


@support_bp.post("/support")
def create_support_ticket():
    response, status = submit_ticket(request)
    return jsonify(response), status
