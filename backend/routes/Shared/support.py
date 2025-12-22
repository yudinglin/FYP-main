from flask import Blueprint, request, jsonify
from controllers.Shared.support_controller import submit_ticket, get_all_tickets, respond_to_ticket

support_bp = Blueprint("support_bp", __name__, url_prefix="/api")


@support_bp.post("/support")
def create_support_ticket():
    response, status = submit_ticket(request)
    return jsonify(response), status


@support_bp.get("/admin/support/tickets")
def get_support_tickets():
    response, status = get_all_tickets()
    return jsonify(response), status


@support_bp.post("/admin/support/tickets/<int:ticket_id>/respond")
def respond_to_support_ticket(ticket_id):
    response, status = respond_to_ticket(request, ticket_id)
    return jsonify(response), status
