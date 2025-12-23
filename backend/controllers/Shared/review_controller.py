from models.Review import Review
from models.UserAccount import UserAccount
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def get_reviews():
    reviews = Review.get_reviews(min_rating=4)
    return [
        {
            "review_id": r.review_id,
            "rating": r.rating,
            "comment": r.comment,
            "user_name": (
                f"{r.user['first_name']} {r.user['last_name']}"
                if r.user else "Anonymous"
            ),
        }
        for r in reviews
    ]


def create_review():
    try:
        # Require JWT
        verify_jwt_in_request()
        email = get_jwt_identity()   # JWT stores email, not user_id
        
        # Get user by email to retrieve user_id
        user = UserAccount.find_by_email(email)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user_id = user.user_id

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        rating = data.get("rating")
        comment = data.get("comment")

        # Validate rating
        if not rating or not (1 <= rating <= 5):
            return jsonify({"error": "Invalid rating. Must be between 1 and 5"}), 400

        # Validate comment
        if not comment or not comment.strip():
            return jsonify({"error": "Comment is required"}), 400

        # Create review
        review = Review.create(
            user_id=user_id,
            rating=rating,
            comment=comment.strip()
        )

        if not review:
            return jsonify({"error": "Failed to create review"}), 500

        return jsonify(review.to_dict()), 201

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
