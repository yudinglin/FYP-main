# backend/app.py
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import os

# import blueprint
from Controller.Unregistered_User.registered_user_controller import register_bp
from Controller.Shared.login_controller import login_bp
from Controller.Shared.profile_controller import profile_bp  

load_dotenv()

app = Flask(__name__)
CORS(app)

# JWT password take from .env 
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET")

jwt = JWTManager(app)

# build blueprint
app.register_blueprint(register_bp)
app.register_blueprint(login_bp)
app.register_blueprint(profile_bp)   


@app.route('/api/ping')
def ping():
    return {"message": "Backend is running"}


if __name__ == '__main__':
    app.run(debug=True, port=5000)
