import mysql.connector
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    url = os.getenv("DATABASE_URL")
    if url:
        p = urlparse(url)
        return mysql.connector.connect(
            host=p.hostname,
            port=p.port or 3306,
            user=p.username,
            password=p.password,
            database=p.path.lstrip("/"),
        )

    # fallback: local dev
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME"),
    )
