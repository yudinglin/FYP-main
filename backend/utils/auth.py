from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        role = (get_jwt().get("role") or "").lower()
        if role != "admin":
            return jsonify({"message": "Forbidden"}), 403
        return fn(*args, **kwargs)
    return wrapper
