from flask import Blueprint, jsonify
from controllers.Shared.review_controller import get_reviews, create_review
from flask_jwt_extended import jwt_required

review_bp = Blueprint("review_bp", __name__, url_prefix="/api")

@review_bp.get("/reviews")
def reviews():
    review_list = get_reviews()
    return jsonify(review_list)

@review_bp.post("/reviews")
@jwt_required()  
def add_review():
    return create_review()
