# models/Review.py
from db import get_connection


class Review:
    def __init__(self, review_id=None, user_id=None, rating=None, comment=None,
                 created_at=None, status="VISIBLE", user=None):
        self.review_id = review_id
        self.user_id = user_id
        self.rating = rating
        self.comment = comment
        self.created_at = created_at
        self.status = status
        self.user = user  # optional: holds first_name + last_name

    # Convert to JSON-friendly dict
    def to_dict(self):
        return {
            "review_id": self.review_id,
            "user_id": self.user_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": (
                self.created_at.strftime("%Y-%m-%d")
                if self.created_at else None
            ),
            "user_name": (
                f"{self.user['first_name']} {self.user['last_name']}"
                if self.user else None
            )
        }

    # --------------------------------------------
    # STATIC METHODS – DB Access
    # --------------------------------------------

    @staticmethod
    def get_reviews():
        """Return list of Review objects with user names."""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT r.*, u.first_name, u.last_name
            FROM Review r
            JOIN User u ON r.user_id = u.user_id
            WHERE r.status = 'VISIBLE'
            ORDER BY r.created_at DESC
        """)
        rows = cursor.fetchall()

        reviews = []
        for row in rows:
            review = Review(
                review_id=row["review_id"],
                user_id=row["user_id"],
                rating=row["rating"],
                comment=row["comment"],
                created_at=row["created_at"],
                status=row["status"],
                user={
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                }
            )
            reviews.append(review)

        cursor.close()
        conn.close()
        return reviews

    @staticmethod
    def get_by_id(review_id):
        """Return single review object or None."""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT r.*, u.first_name, u.last_name
            FROM Review r
            JOIN User u ON r.user_id = u.user_id
            WHERE r.review_id = %s
        """, (review_id,))
        
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return None

        return Review(
            review_id=row["review_id"],
            user_id=row["user_id"],
            rating=row["rating"],
            comment=row["comment"],
            created_at=row["created_at"],
            status=row["status"],
            user={
                "first_name": row["first_name"],
                "last_name": row["last_name"]
            }
        )

    @staticmethod
    def create(user_id, rating, comment):
        """Insert a new review and return the created Review object."""
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                INSERT INTO Review (user_id, rating, comment)
                VALUES (%s, %s, %s)
            """, (user_id, rating, comment))

            conn.commit()
            new_id = cursor.lastrowid

            if not new_id:
                raise Exception("Failed to insert review - no ID returned")

            return Review.get_by_id(new_id)
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
