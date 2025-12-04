from models.UserAccount import UserAccount

def get_all_users():
    """
    Fetch all users from the database.
    Returns a list of dicts suitable for JSON response.
    """
    return [user.to_dict() for user in UserAccount.get_all()]
