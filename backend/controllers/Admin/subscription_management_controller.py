from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.UserAccount import UserAccount
from models.SubscriptionPlan import SubscriptionPlan
from models.Subscription import Subscription
from datetime import datetime


def _require_admin():
    verify_jwt_in_request()
    identity = get_jwt_identity()
    admin = UserAccount.find_by_email(identity)
    if not admin or (admin.role or "").lower() != "admin":
        return None, ({"message": "Admin access required"}, 403)
    return admin, None


def _get(obj, key):
    # works for dicts and objects
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _dt(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def get_all_subscriptions_admin():
    _, err = _require_admin()
    if err:
        return err

    subscriptions = Subscription.get_all()
    rows = []

    for s in subscriptions:
        user_id = _get(s, "user_id")
        plan_id = _get(s, "plan_id")

        user = UserAccount.find_by_id(user_id) if user_id else None
        plan = SubscriptionPlan.find_by_id(plan_id) if plan_id else None

        if plan:
            plan_name = plan.name
        elif user and user.role == "business":
            plan_name = "Business"
        elif user and user.role == "creator":
            plan_name = "Content Creator"
        else:
            plan_name = "-"

        rows.append({
            "subscription_id": _get(s, "subscription_id"),
            "user_email": user.email if user else "-",
            "plan_name": plan_name,
            "status": _get(s, "status"),
            "start_date": _dt(_get(s, "start_date")),
            "end_date": _dt(_get(s, "end_date")),
        })

    return {"subscriptions": rows}, 200


def update_subscription_status_admin(subscription_id, new_status):
    _, err = _require_admin()
    if err:
        return err

    updated = Subscription.update_status(subscription_id, new_status)
    if not updated:
        return {"message": "Subscription not found"}, 404

    return {
        "subscription": {
            "subscription_id": _get(updated, "subscription_id"),
            "status": _get(updated, "status"),
        }
    }, 200
