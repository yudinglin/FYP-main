from db import get_connection
from werkzeug.security import generate_password_hash, check_password_hash


class UserAccount:
    def __init__(self, user_id, email, password_hash, first_name, last_name, role, status, youtube_channel=None):
        self.user_id = user_id
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.role = role
        self.status = status
        self.youtube_channel = youtube_channel  # new

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
            status=row["status"],
            youtube_channel=row.get("youtube_channel")  # new
        )

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role,
            "status": self.status,
            "youtube_channel": self.youtube_channel,  # new
        }

    # -------------------------------------------------------------------------
    # FINDERS
    # -------------------------------------------------------------------------
    @classmethod
    def find_by_email(cls, email):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT
        u.user_id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.status,
        yc.youtube_channel_id AS youtube_channel
        FROM User u
        LEFT JOIN CreatorProfile cp ON cp.user_id = u.user_id
        LEFT JOIN YouTubeChannel yc ON yc.channel_id = cp.primary_channel_id
        WHERE u.email = %s
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


    # -------------------------------------------------------------------------
    # Channel
    # -------------------------------------------------------------------------
    @classmethod
    def set_creator_primary_channel(cls, email, youtube_channel_id: str):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1) get user_id + role
        cursor.execute("SELECT user_id, role FROM User WHERE email=%s", (email,))
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            return None, "User not found"

        user_id = row["user_id"]
        role = row["role"]
        if role != "creator":
            cursor.close(); conn.close()
            return None, "Only creator can set primary channel here"

        # 2) insert or update YouTubeChannel
        # schema has UNIQUE( youtube_channel_id ) so we can upsert
        cursor.execute("""
            INSERT INTO YouTubeChannel (owner_user_id, youtube_channel_id, is_primary)
            VALUES (%s, %s, 1)
            ON DUPLICATE KEY UPDATE
                owner_user_id = VALUES(owner_user_id),
                is_primary = 1
        """, (user_id, youtube_channel_id))

        # 3) find the channel_id
        cursor.execute("""
            SELECT channel_id FROM YouTubeChannel WHERE youtube_channel_id=%s
        """, (youtube_channel_id,))
        ch = cursor.fetchone()
        if not ch:
            conn.rollback()
            cursor.close(); conn.close()
            return None, "Failed to save channel"

        channel_id_pk = ch["channel_id"]

        # 4) update CreatorProfile.primary_channel_id
        cursor.execute("""
            UPDATE CreatorProfile
            SET primary_channel_id=%s
            WHERE user_id=%s
        """, (channel_id_pk, user_id))

        conn.commit()
        cursor.close()
        conn.close()

        # return updated user (we will enhance to_dict later)
        return cls.find_by_email(email), None