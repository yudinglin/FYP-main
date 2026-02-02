from flask import Blueprint, jsonify, request
from controllers.Admin.subscription_management_controller import (
    get_all_subscriptions_admin,
    update_subscription_status_admin
)

subscription_admin_bp = Blueprint("subscription_admin_bp", __name__)

@subscription_admin_bp.get("/subscriptions")
def admin_get_subscriptions():
    data, status = get_all_subscriptions_admin()
    return jsonify(data), status


@subscription_admin_bp.put("/subscriptions/<int:subscription_id>/status")
def admin_update_subscription(subscription_id):
    body = request.get_json() or {}
    new_status = (body.get("status") or "").upper().strip()

    if not new_status:
        return jsonify({"message": "Missing status"}), 400

    data, status = update_subscription_status_admin(subscription_id, new_status)
    return jsonify(data), status
