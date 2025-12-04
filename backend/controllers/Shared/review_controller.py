from models.Review import Review

def get_reviews():
    """
    Controller function to fetch all visible reviews.
    Returns a list of dictionaries ready for JSON serialization.
    """
    reviews = Review.get_reviews()  # Use model class method
    return [
        {
            "review_id": r.review_id,
            "comment": r.comment,
            "user_name": f"{r.user['first_name']} {r.user['last_name']}" if r.user else None,
        }
        for r in reviews
    ]
