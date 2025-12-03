from models.UserAccount import UserAccount

def register_user(request):
    data = request.get_json() or {}

    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    role = data.get('role')

    # Validate required fields
    if not email or not password:
        return {"message": "Email and password required"}, 400

    if not first_name or not last_name:
        return {"message": "First and last name required"}, 400

    # Validate roles
    valid_roles = {
        "creator": "creator",
        "business": "business",
        "admin": "admin"
    }
    role = valid_roles.get(role, "creator")

    # Prevent duplicate emails
    if UserAccount.find_by_email(email):
        return {"message": "Email already registered"}, 409

    # Create user
    UserAccount.create_user(email, password, first_name, last_name, role)

    return {"message": "Registered successfully"}, 201
