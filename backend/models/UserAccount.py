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
        if not row:
            return None
        return cls(
            user_id=row["user_id"],
            email=row["email"],
            password_hash=row["password_hash"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            role=row["role"],
            status=row["status"]
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

    # -------------------------------------------------------------------------
    # FINDERS
    # -------------------------------------------------------------------------
    @classmethod
    def find_by_email(cls, email):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User WHERE email = %s
        """, (email,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

    @classmethod
    def find_by_id(cls, user_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

    # -------------------------------------------------------------------------
    # USER + PROFILE CREATION (ALL DB WORK DONE HERE)
    # -------------------------------------------------------------------------
    @classmethod
    def register_user(cls, email, password, first_name, last_name, role, company_name=None, industry_id=None):
        hashed_pw = generate_password_hash(password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Create User
        cursor.execute(
            """
            INSERT INTO User (email, password_hash, first_name, last_name, role)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (email, hashed_pw, first_name, last_name, role),
        )
        conn.commit()

        # Get the newly created user_id
        user_id = cursor.lastrowid

        # 2. Create role-specific profile
        if role == "creator":
            cursor.execute(
                """
                INSERT INTO CreatorProfile (user_id, display_name)
                VALUES (%s, %s)
                """,
                (user_id, f"{first_name} {last_name}")
            )
        elif role == "business":
            cursor.execute(
                """
                INSERT INTO BusinessProfile (user_id, company_name, industry_id)
                VALUES (%s, %s, %s)
                """,
                (user_id, company_name or f"{first_name} {last_name}", industry_id)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return cls.find_by_email(email)

    # -------------------------------------------------------------------------
    # UPDATES
    # -------------------------------------------------------------------------
    @classmethod
    def update_name(cls, email, first_name, last_name):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Update User table
        cursor.execute("""
            UPDATE User
            SET first_name = %s, last_name = %s
            WHERE email = %s
        """, (first_name, last_name, email))

        # 2. Fetch user_id and role
        cursor.execute("""
            SELECT user_id, role FROM User WHERE email = %s
        """, (email,))
        row = cursor.fetchone()
        user_id = row['user_id']
        role = row['role']

        # 3. Update role-specific profile
        if role == "creator":
            display_name = f"{first_name} {last_name}"
            cursor.execute("""
                UPDATE CreatorProfile
                SET display_name = %s
                WHERE user_id = %s
            """, (display_name, user_id))
        elif role == "business":
            # Optionally update company_name if you want to reflect first/last name
            pass  # or implement your logic if needed

        conn.commit()
        cursor.close()
        conn.close()

        return cls.find_by_email(email)


    @classmethod
    def update_password(cls, email, new_password):
        hashed_pw = generate_password_hash(new_password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            UPDATE User SET password_hash = %s WHERE email = %s
        """, (hashed_pw, email))

        conn.commit()
        cursor.close()
        conn.close()
        return cls.find_by_email(email)

    @classmethod
    def update_status(cls, email, status):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            UPDATE User SET status = %s WHERE email = %s
        """, (status, email))

        conn.commit()
        cursor.close()
        conn.close()
        return cls.find_by_email(email)

    # -------------------------------------------------------------------------
    # MISC
    # -------------------------------------------------------------------------
    def check_password(self, plain_password):
        return check_password_hash(self.password_hash, plain_password)

    @classmethod
    def get_all(cls):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User
        """)
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        return [cls.from_row(row) for row in rows]
