from models.UserAccount import UserAccount

def register_user(request):
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    role = data.get("role", "creator")

    # Guard: prevent public registration of admin accounts
    if role not in ("creator", "business"):
        return {"message": "Invalid role"}, 400

    if UserAccount.find_by_email(email):
        return {"message": "Email already registered"}, 409

    new_user = UserAccount.register_user(email, password, first_name, last_name, role)

    return {"message": "Registered successfully", "user": new_user.to_dict()}, 201
