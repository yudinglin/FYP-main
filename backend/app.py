# backend/app.py
import os
import mysql.connector
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

from db import get_connection

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

from routes.Admin.subscription_plans import subscription_plans_bp
from routes.Admin.get_users import user_bp
from routes.Admin.manage_users import manage_users_bp
from routes.Admin.manage_subscriptions import subscription_admin_bp

from routes.YouTube.centrality_metrics import centrality_bp
from routes.YouTube.video_sentiment import sentiment_bp
from routes.YouTube.subscriber_prediction import subscriber_predict_bp
from routes.YouTube.video_correlation_business import performance_bp
from routes.YouTube.predictive_analysis_business import predictive_bp
from routes.YouTube.audience_resonance import enhanced_analyzer_bp

load_dotenv()

app = Flask(__name__)

# --- CORS ---
# Local dev + (optional) Netlify prod domain
# If you haven't set FRONTEND_ORIGIN in Render yet, it will still allow localhost only.
frontend_origin = os.getenv("FRONTEND_ORIGIN", "").strip()
origins = ["http://localhost:5173", "http://127.0.0.1:5173" ，"https://fyp-main.onrender.com"]
if frontend_origin:
    origins.append(frontend_origin)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)

# --- JWT ---
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me-in-env")
jwt = JWTManager(app)

# --- blueprints ---
app.register_blueprint(register_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(login_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(channels_bp)
app.register_blueprint(videos_bp)
app.register_blueprint(review_bp)
app.register_blueprint(support_bp)

app.register_blueprint(subscription_plans_bp)

app.register_blueprint(video_corr_bp)
app.register_blueprint(comments_bp)
app.register_blueprint(centrality_bp)
app.register_blueprint(sentiment_bp)
app.register_blueprint(subscriber_predict_bp)
app.register_blueprint(performance_bp)
app.register_blueprint(predictive_bp)
app.register_blueprint(enhanced_analyzer_bp)

# admin routes
app.register_blueprint(user_bp, url_prefix="/api/admin")
app.register_blueprint(subscription_admin_bp, url_prefix="/api/admin")
app.register_blueprint(manage_users_bp, url_prefix="/api/admin")


@app.route("/api/ping")
def ping():
    return {"message": "Backend is running"}


# --- DB init (auto create tables once) ---
def init_db():
    """
    Execute schema.sql to create tables.
    Safe to run on every boot: it skips "already exists" errors.
    IMPORTANT: When Render Root Directory is set to 'backend', schema.sql is in current working dir.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Root Directory=backend => schema.sql is at ./schema.sql
        with open("schema.sql", "r", encoding="utf-8") as f:
            sql = f.read()

        for statement in sql.split(";"):
            stmt = statement.strip()
            if not stmt:
                continue
            try:
                cursor.execute(stmt)
            except mysql.connector.Error as e:
                # Ignore: table exists (1050) / database exists (1007)
                if e.errno in (1050, 1007):
                    continue
                raise

        conn.commit()
        cursor.close()
        conn.close()
        print("init_db done")
    except Exception as e:
        # Don't crash the service just because init failed
        print("init_db failed:", e)


# Run after app is created and routes are registered (gunicorn import will execute this)
init_db()


if __name__ == "__main__":
    app.run(debug=True, port=5000)

