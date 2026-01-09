from db import get_connection
from werkzeug.security import generate_password_hash, check_password_hash


class UserAccount:
    def __init__(self, user_id, email, password_hash, first_name, last_name, role, status, youtube_channel=None, youtube_channels=None):
        self.user_id = user_id
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.role = role
        self.status = status

        # creator primary channel（单个）
        self.youtube_channel = youtube_channel

        # business channels（多个）
        self.youtube_channels = youtube_channels or []

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
            youtube_channel=row.get("youtube_channel"),  # creator 可能会有
        )

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role,
            "status": self.status,
            # creator
            "youtube_channel": self.youtube_channel,
            # business
            "youtube_channels": self.youtube_channels,
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

        if not row:
            cursor.close()
            conn.close()
            return None

        user = cls.from_row(row)

        # YouTube channels for both roles
        user.youtube_channels = cls.get_youtube_channels_by_user(user.user_id)

        # creator primary channel
        user.youtube_channel = cls.get_creator_primary_channel(user.user_id)

        cursor.close()
        conn.close()
        return user

    @classmethod
    def find_by_id(cls, user_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            return None

        user = cls.from_row(row)
        user.youtube_channels = cls.get_youtube_channels_by_user(user.user_id)
        user.youtube_channel = cls.get_creator_primary_channel(user.user_id)

        cursor.close()
        conn.close()
        return user

    # -------------------------------------------------------------------------
    # YouTube channel helpers
    # -------------------------------------------------------------------------
    @classmethod
    def get_youtube_channels_by_user(cls, owner_user_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT youtube_channel_id AS url,
                   channel_name AS name,
                   is_primary
            FROM YouTubeChannel
            WHERE owner_user_id = %s
            ORDER BY is_primary DESC, created_at ASC
        """, (owner_user_id,))
        rows = cursor.fetchall() or []

        cursor.close()
        conn.close()
        # ：{url,name,is_primary}
        return [
            {
                "url": (r.get("url") or "").strip(),
                "name": (r.get("name") or "").strip(),
                "is_primary": bool(r.get("is_primary")),
            }
            for r in rows
            if (r.get("url") or "").strip()
        ]

    @classmethod
    def get_creator_primary_channel(cls, user_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT yc.youtube_channel_id AS youtube_channel
            FROM CreatorProfile cp
            LEFT JOIN YouTubeChannel yc ON yc.channel_id = cp.primary_channel_id
            WHERE cp.user_id = %s
        """, (user_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return (row.get("youtube_channel") if row else None)

    @classmethod
    def save_youtube_channels(cls, owner_user_id, channels):
        if isinstance(channels, list) and len(channels) > 5:
           channels = channels[:5]
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Collect URLs to keep
        urls_to_keep = [(ch.get("url") or "").strip() for ch in channels if (ch.get("url") or "").strip()]

        # Delete channels not in the new list
        if urls_to_keep:
            placeholders = ','.join(['%s'] * len(urls_to_keep))
            cursor.execute(f"""
                DELETE FROM YouTubeChannel
                WHERE owner_user_id = %s AND youtube_channel_id NOT IN ({placeholders})
            """, (owner_user_id, *urls_to_keep))
        else:
            # If no URLs, delete all
            cursor.execute("""
                DELETE FROM YouTubeChannel
                WHERE owner_user_id = %s
            """, (owner_user_id,))

        # Reset is_primary for remaining channels (though delete above may have removed them)
        cursor.execute("""
            UPDATE YouTubeChannel
            SET is_primary = 0
            WHERE owner_user_id = %s
        """, (owner_user_id,))

        primary_channel_id = None
        for idx, ch in enumerate(channels):
            url = (ch.get("url") or "").strip()
            if not url:
                continue
            name = (ch.get("name") or "").strip() or f"Channel {idx+1}"
            is_primary = 1 if idx == 0 else 0

            # upsert（youtube_channel_id 全局唯一）
            cursor.execute("""
                INSERT INTO YouTubeChannel (owner_user_id, youtube_channel_id, channel_name, is_primary)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    owner_user_id = VALUES(owner_user_id),
                    channel_name = VALUES(channel_name),
                    is_primary = VALUES(is_primary)
            """, (owner_user_id, url, name, is_primary))

            # Get the channel_id for primary (only for creators)
            if is_primary:
                cursor.execute("""
                    SELECT channel_id FROM YouTubeChannel
                    WHERE youtube_channel_id = %s AND owner_user_id = %s
                """, (url, owner_user_id))
                row = cursor.fetchone()
                if row:
                    primary_channel_id = row['channel_id']

        # Update CreatorProfile if user is creator
        cursor.execute("SELECT role FROM User WHERE user_id = %s", (owner_user_id,))
        user_row = cursor.fetchone()
        if user_row and user_row['role'] == 'creator':
            cursor.execute("""
                UPDATE CreatorProfile
                SET primary_channel_id = %s
                WHERE user_id = %s
            """, (primary_channel_id, owner_user_id))

        conn.commit()
        cursor.close()
        conn.close()

    # -------------------------------------------------------------------------
    # USER + PROFILE CREATION
    # -------------------------------------------------------------------------
    @classmethod
    def register_user(cls, email, password, first_name, last_name, role, company_name=None, industry_id=None):
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

        user_id = cursor.lastrowid

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

        cursor.execute("""
            UPDATE User
            SET first_name = %s, last_name = %s
            WHERE email = %s
        """, (first_name, last_name, email))

        conn.commit()
        cursor.close()
        conn.close()
        return cls.find_by_email(email)

    def check_password(self, plain_password):
        return check_password_hash(self.password_hash, plain_password)
