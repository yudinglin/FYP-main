from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.SubscriptionPlan import SubscriptionPlan
from models.UserAccount import UserAccount
import json


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

        if not user or user.role.lower() != "admin":
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

        if not user or user.role.lower() != "admin":
            return {"message": "Admin access required"}, 403

        data = request.get_json() or {}
        
        updates = {}
        
        # ---- description + features (Compatible with older front-end syntax: JSON included in the description) ----
        incoming_desc = data.get("description", None)
        incoming_features = data.get("features", None)
        
        # if description is JSON string：{"description":"...","features":[...]}
        if isinstance(incoming_desc, str):
            s = incoming_desc.strip()
            if s.startswith("{") or s.startswith("["):
                try:
                    obj = json.loads(s)
                    if isinstance(obj, dict):
                        if "description" in obj:
                            incoming_desc = obj.get("description")
                        if incoming_features is None and "features" in obj:
                            incoming_features = obj.get("features")
                    elif isinstance(obj, list):
                        # The compatible description is directly ["f1","f2"]
                        if incoming_features is None:
                            incoming_features = obj
                        incoming_desc = ""
                except Exception:
                    pass
        
        # write back description（text only）
        if incoming_desc is not None:
            updates["description"] = incoming_desc
        
        # write back features（DB store as \n concatenated string）
        if incoming_features is not None:
            if isinstance(incoming_features, list):
                cleaned = [str(x).strip() for x in incoming_features if str(x).strip()]
                updates["features"] = "\n".join(cleaned)
            else:
                # Compatible with the frontend directly passing a string
                updates["features"] = str(incoming_features)
        
        # ---- Other fields remain the same ----
        if "name" in data:
            updates["name"] = data.get("name")
        
        if "target_role" in data:
            updates["target_role"] = data.get("target_role")
        
        if "price_monthly" in data:
            price_monthly = data.get("price_monthly")
            if price_monthly is not None:
                try:
                    price_monthly = float(price_monthly)
                    if price_monthly < 0:
                        return {"message": "Price must be non-negative"}, 400
                except (ValueError, TypeError):
                    return {"message": "Invalid price format"}, 400
            updates["price_monthly"] = price_monthly
        
        if "max_channels" in data:
            updates["max_channels"] = data.get("max_channels")
        
        if "max_saved_graphs" in data:
            updates["max_saved_graphs"] = data.get("max_saved_graphs")
        
        if "is_active" in data:
            updates["is_active"] = data.get("is_active")
        
        if not updates:
            return {"message": "No valid fields to update"}, 400
        
        updated_plan = SubscriptionPlan.update(plan_id=plan_id, **updates)

        if not updated_plan:
            return {"message": "Failed to update plan"}, 500

        return {"message": "Plan updated successfully", "plan": updated_plan.to_dict()}, 200

    except Exception as e:
        return {"message": f"Error updating plan: {str(e)}"}, 500
