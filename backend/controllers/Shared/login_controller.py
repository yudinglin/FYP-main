from flask_jwt_extended import create_access_token
from models.UserAccount import UserAccount

def login_user(request):
    data = request.get_json() or {}

    email = data.get('email')
    password = data.get('password')

    # Validate required fields
    if not email or not password:
        return {"message": "Email and password are required"}, 400

    # Check if user exists
    user = UserAccount.find_by_email(email)
    if not user:
        return {"message": "Invalid email or password"}, 401

    # Check status
    if user.status != "ACTIVE":
        return {"message": "Account is not active, please contact support if this is an error"}, 403

    # Check password
    if not user.check_password(password):
        return {"message": "Invalid email or password"}, 401

    # Create JWT
    token = create_access_token(
    identity=user.email,
    additional_claims={"role": user.role}
)

    return {
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }, 200
