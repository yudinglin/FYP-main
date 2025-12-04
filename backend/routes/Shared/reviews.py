from flask import Blueprint, jsonify
from controllers.Shared.review_controller import get_reviews

review_bp = Blueprint("review_bp", __name__)

@review_bp.get("/reviews")
def reviews():
    """
    Route handler that calls the controller function.
    """
    review_list = get_reviews()  # Controller handles model access
    return jsonify(review_list)
