from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.SubscriptionPlan import SubscriptionPlan
from models.UserAccount import UserAccount


def get_all_plans():
    """Get all active subscription plans (public endpoint)"""
    plans = SubscriptionPlan.get_all_active()
    return {"plans": [plan.to_dict() for plan in plans]}, 200


def get_all_plans_admin():
    """Get all subscription plans including inactive (admin only)"""
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = UserAccount.find_by_email(identity)
        
        if not user or user.role.lower() != 'admin':
            return {"message": "Admin access required"}, 403

        plans = SubscriptionPlan.get_all()
        return {"plans": [plan.to_dict() for plan in plans]}, 200
    except Exception as e:
        return {"message": f"Error retrieving plans: {str(e)}"}, 500


def update_plan(request, plan_id):
    """Update a subscription plan (admin only)"""
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = UserAccount.find_by_email(identity)
        
        if not user or user.role.lower() != 'admin':
            return {"message": "Admin access required"}, 403

        data = request.get_json() or {}
        
        # Check if plan exists
        plan = SubscriptionPlan.find_by_id(plan_id)
        if not plan:
            # Try to find even if inactive for admin
            from db import get_connection
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT plan_id, name, description, target_role, price_monthly, 
                       max_channels, max_saved_graphs, is_active
                FROM SubscriptionPlan
                WHERE plan_id = %s
            """, (plan_id,))
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not row:
                return {"message": "Plan not found"}, 404

        # Extract update fields
        name = data.get("name")
        description = data.get("description")
        target_role = data.get("target_role")
        price_monthly = data.get("price_monthly")
        max_channels = data.get("max_channels")
        max_saved_graphs = data.get("max_saved_graphs")
        is_active = data.get("is_active")

        # Validate price_monthly if provided
        if price_monthly is not None:
            try:
                price_monthly = float(price_monthly)
                if price_monthly < 0:
                    return {"message": "Price must be non-negative"}, 400
            except (ValueError, TypeError):
                return {"message": "Invalid price format"}, 400

        # Update the plan
        updated_plan = SubscriptionPlan.update(
            plan_id=plan_id,
            name=name,
            description=description,
            target_role=target_role,
            price_monthly=price_monthly,
            max_channels=max_channels,
            max_saved_graphs=max_saved_graphs,
            is_active=is_active
        )

        if not updated_plan:
            return {"message": "Failed to update plan"}, 500

        return {"message": "Plan updated successfully", "plan": updated_plan.to_dict()}, 200

    except Exception as e:
        return {"message": f"Error updating plan: {str(e)}"}, 500

