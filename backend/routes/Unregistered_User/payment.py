from flask import Blueprint, request, jsonify
from controllers.Unregistered_User.payment_controller import get_plans, process_payment_and_register

payment_bp = Blueprint('payment_bp', __name__)

@payment_bp.route('/api/pricing', methods=['GET'])
def pricing():
    """Get all active subscription plans"""
    response, status = get_plans()
    return jsonify(response), status

@payment_bp.route('/api/payment/process', methods=['POST'])
def process_payment():
    """Process payment and register user (simulated payment)"""
    response, status = process_payment_and_register(request)
    return jsonify(response), status

