# backend/app.py
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import os

# import blueprint
from routes.Unregistered_User.register_user import register_bp
from routes.Unregistered_User.payment import payment_bp
from routes.Shared.login import login_bp
from routes.Shared.profile import profile_bp 
from routes.YouTube.channels_list import channels_bp
from routes.YouTube.videos_list import videos_bp
from routes.YouTube.video_correlation import video_corr_bp
from routes.YouTube.video_comments import comments_bp
from routes.Shared.reviews import review_bp
from routes.Shared.support import support_bp
from routes.Admin.get_users import user_bp
from routes.Admin.subscription_plans import subscription_plans_bp
from routes.YouTube.centrality_metrics import centrality_bp
from routes.YouTube.video_sentiment import sentiment_bp
from routes.YouTube.subscriber_prediction import subscriber_predict_bp


load_dotenv()

app = Flask(__name__)
CORS(app)

# JWT password take from .env 
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET")

jwt = JWTManager(app)

# build blueprint
app.register_blueprint(register_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(login_bp)
app.register_blueprint(profile_bp)   
app.register_blueprint(channels_bp)
app.register_blueprint(videos_bp)
app.register_blueprint(review_bp)
app.register_blueprint(support_bp)
app.register_blueprint(user_bp)
app.register_blueprint(subscription_plans_bp)
app.register_blueprint(video_corr_bp)
app.register_blueprint(comments_bp)
app.register_blueprint(centrality_bp)
app.register_blueprint(sentiment_bp)
app.register_blueprint(subscriber_predict_bp)

@app.route('/api/ping')
def ping():
    return {"message": "Backend is running"}


if __name__ == '__main__':
    app.run(debug=True, port=5000)
