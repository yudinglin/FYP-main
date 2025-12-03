# controllers/profile_controller.py
from flask_jwt_extended import get_jwt_identity
from models.UserAccount import UserAccount

def get_profile():
    """Fetch the logged-in user's profile."""
    email = get_jwt_identity()
    return UserAccount.find_by_email(email)

def update_profile(first_name: str, last_name: str):
    """Update the logged-in user's profile."""
    email = get_jwt_identity()
    return UserAccount.update_name(email, first_name, last_name)
