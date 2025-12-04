# backend/Entity/UserAccount.py
from db import get_connection
from werkzeug.security import generate_password_hash, check_password_hash


class UserAccount:
    def __init__(self, user_id, email, password_hash, first_name, last_name, role, status):
        self.user_id = user_id
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.role = role
        self.status = status


    @classmethod
    def from_row(cls, row):
        if row is None:
            return None

        return cls(
            user_id=row.get("user_id"),
            email=row.get("email"),
            password_hash=row.get("password_hash"),
            first_name=row.get("first_name"),
            last_name=row.get("last_name"),
            role=row.get("role"),
            status=row.get("status"),
        )

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role,
            "status": self.status,
        }


    @classmethod
    def find_by_email(cls, email):
    
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User
            WHERE email = %s
            """,
            (email,),
        )
        row = cursor.fetchone()

        cursor.close()
        conn.close()

        return cls.from_row(row)

    @classmethod
    def find_by_id(cls, user_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User
            WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cursor.fetchone()

        cursor.close()
        conn.close()

        return cls.from_row(row)


    @classmethod
    def create_user(cls, email, password, first_name, last_name, role):
        hashed_pw = generate_password_hash(password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            INSERT INTO User (email, password_hash, first_name, last_name, role)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (email, hashed_pw, first_name, last_name, role),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return cls.find_by_email(email)


    @classmethod
    def update_name(cls, email, first_name, last_name):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            UPDATE User
            SET first_name = %s,
                last_name = %s
            WHERE email = %s
            """,
            (first_name, last_name, email),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return cls.find_by_email(email)

    @classmethod
    def update_password(cls, email, new_password):
        hashed_pw = generate_password_hash(new_password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            UPDATE User
            SET password_hash = %s
            WHERE email = %s
            """,
            (hashed_pw, email),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return cls.find_by_email(email)

    @classmethod
    def update_status(cls, email, status):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            UPDATE User
            SET status = %s
            WHERE email = %s
            """,
            (status, email),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return cls.find_by_email(email)


    def check_password(self, plain_password):
        return check_password_hash(self.password_hash, plain_password)
    
    @classmethod
    def get_all(cls):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User
            """
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        return [cls.from_row(row) for row in rows]
