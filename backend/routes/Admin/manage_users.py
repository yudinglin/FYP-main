from flask import Blueprint, jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.UserAccount import UserAccount

manage_users_bp = Blueprint("manage_users_bp", __name__)

def require_admin():
    verify_jwt_in_request()
    identity = get_jwt_identity()  # your identity is email
    admin = UserAccount.find_by_email(identity)
    if not admin or (admin.role or "").lower() != "admin":
        return None
    return admin

def normalize_status(value):
    status = (value or "").upper().strip()
    if status not in {"ACTIVE", "SUSPENDED"}:
        return None
    return status

@manage_users_bp.put("/api/admin/users/<int:user_id>/status")
def update_user_status(user_id):
    admin = require_admin()
    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json() or {}
    status = normalize_status(data.get("status"))
    reason = data.get("reason")  # optional (not stored yet)

    if not status:
        return jsonify({"message": "Invalid status. Use ACTIVE or SUSPENDED."}), 400

    target = UserAccount.find_by_id(user_id)
    if not target:
        return jsonify({"message": "User not found"}), 404

    # Safety: do not allow suspending admin accounts
    if (target.role or "").lower() == "admin" and status == "SUSPENDED":
        return jsonify({"message": "Admin accounts cannot be suspended"}), 403

    try:
        UserAccount.update_status_by_id(user_id, status)
        updated = UserAccount.find_by_id(user_id)
        return jsonify({"message": "User status updated", "user": updated.to_dict()}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@manage_users_bp.put("/api/admin/users/status")
def update_users_status_bulk():
    admin = require_admin()
    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json() or {}
    status = normalize_status(data.get("status"))
    user_ids = data.get("user_ids") or []
    reason = data.get("reason")  # optional (not stored yet)

    if not status:
        return jsonify({"message": "Invalid status. Use ACTIVE or SUSPENDED."}), 400

    try:
        # Normalize IDs and remove duplicates
        ids = []
        for x in user_ids:
            try:
                ids.append(int(x))
            except Exception:
                continue
        ids = list(dict.fromkeys(ids))

        if not ids:
            return jsonify({"message": "No valid user_ids provided", "updated": 0, "skipped_admin": 0, "updated_user_ids": []}), 200

        # Skip admin accounts (protected)
        eligible_ids = []
        skipped_admin = 0
        for uid in ids:
            u = UserAccount.find_by_id(uid)
            if not u:
                continue
            if (u.role or "").lower() == "admin":
                skipped_admin += 1
                continue
            eligible_ids.append(uid)

        if not eligible_ids:
            return jsonify({"message": "No eligible users to update (admin accounts are protected)", "updated": 0, "skipped_admin": skipped_admin, "updated_user_ids": []}), 200

        affected = UserAccount.update_status_bulk(eligible_ids, status)

        return jsonify({
            "message": "Bulk status updated",
            "updated": affected,
            "skipped_admin": skipped_admin,
            "updated_user_ids": eligible_ids
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 400