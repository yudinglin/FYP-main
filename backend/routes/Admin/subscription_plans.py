from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from controllers.Admin.subscription_plan_controller import (
    get_all_plans_admin,
    update_plan
)

subscription_plans_bp = Blueprint("subscription_plans_bp", __name__, url_prefix="/api")

@subscription_plans_bp.get("/admin/plans")
@jwt_required()
def get_all_plans_admin_route():
    response, status = get_all_plans_admin()
    return jsonify(response), status

@subscription_plans_bp.put("/admin/plans/<int:plan_id>")
@jwt_required()
def update_plan_route(plan_id):
    response, status = update_plan(request, plan_id)
    return jsonify(response), status

