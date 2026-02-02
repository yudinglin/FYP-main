from db import get_connection
from datetime import datetime, timedelta
from models.UserAccount import UserAccount
from models.SubscriptionPlan import SubscriptionPlan
from utils.email_service import email_service
from flask_jwt_extended import get_jwt_identity


class Subscription:
    def __init__(self, subscription_id, user_id, plan_id, status, start_date, end_date=None, cancelled_at=None):
        self.subscription_id = subscription_id
        self.user_id = user_id
        self.plan_id = plan_id
        self.status = status
        self.start_date = start_date
        self.end_date = end_date
        self.cancelled_at = cancelled_at

    @classmethod
    def from_row(cls, row):
        if not row:
            return None
        return cls(
            subscription_id=row["subscription_id"],
            user_id=row["user_id"],
            plan_id=row["plan_id"],
            status=row["status"],
            start_date=row["start_date"],
            end_date=row.get("end_date"),
            cancelled_at=row.get("cancelled_at")
        )

    def to_dict(self):
        return {
            "subscription_id": self.subscription_id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "status": self.status,
            "start_date": self.start_date.isoformat() if isinstance(self.start_date, datetime) else str(self.start_date),
            "end_date": self.end_date.isoformat() if self.end_date and isinstance(self.end_date, datetime) else (str(self.end_date) if self.end_date else None),
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at and isinstance(self.cancelled_at, datetime) else (str(self.cancelled_at) if self.cancelled_at else None)
        }

    # ------------------------------------------------------------------
    # CREATE / FIND
    # ------------------------------------------------------------------

    @classmethod
    def create(cls, user_id, plan_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)

        cursor.execute("""
            INSERT INTO Subscription (user_id, plan_id, status, start_date, end_date)
            VALUES (%s, %s, 'ACTIVE', %s, %s)
        """, (user_id, plan_id, start_date, end_date))
        conn.commit()

        subscription_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return cls.find_by_id(subscription_id)

    @classmethod
    def find_by_id(cls, subscription_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT subscription_id, user_id, plan_id, status, start_date, end_date, cancelled_at
            FROM Subscription
            WHERE subscription_id = %s
        """, (subscription_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

    @classmethod
    def find_active_by_user_id(cls, user_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT subscription_id, user_id, plan_id, status, start_date, end_date, cancelled_at
            FROM Subscription
            WHERE user_id = %s AND status = 'ACTIVE'
            ORDER BY start_date DESC
            LIMIT 1
        """, (user_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

    # ------------------------------------------------------------------
    # ADMIN: GET ALL 
    # ------------------------------------------------------------------

    @classmethod
    def get_all(cls):
        """
        Get all subscriptions WITH user email and plan name.
        This matches frontend expectations exactly.
        """
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                s.subscription_id,
                s.user_id,
                s.plan_id,
                s.status,
                s.start_date,
                s.end_date,
                s.cancelled_at,
                u.email AS user_email,
                COALESCE(p.name,
                    CASE
                        WHEN u.role = 'business' THEN 'Business'
                        WHEN u.role = 'creator' THEN 'Content Creator'
                        ELSE '-'
                    END
                ) AS plan_name
            FROM Subscription s
            LEFT JOIN User u ON u.user_id = s.user_id
            LEFT JOIN SubscriptionPlan p ON p.plan_id = s.plan_id
            ORDER BY s.start_date DESC
        """)

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        return rows

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    @classmethod
    def update_plan(cls, subscription_id, new_plan_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        current_sub = cls.find_by_id(subscription_id)
        if not current_sub or current_sub.status != 'ACTIVE':
            cursor.close()
            conn.close()
            return None

        cursor.execute("""
            UPDATE Subscription
            SET plan_id = %s
            WHERE subscription_id = %s AND status = 'ACTIVE'
        """, (new_plan_id, subscription_id))
        conn.commit()

        cursor.close()
        conn.close()
        return cls.find_by_id(subscription_id)

    @classmethod
    def update_status(cls, subscription_id, new_status):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            UPDATE Subscription
            SET status = %s
            WHERE subscription_id = %s
        """, (new_status, subscription_id))
        conn.commit()

        updated = cursor.rowcount > 0
        cursor.close()
        conn.close()

        if not updated:
            return None
        return cls.find_by_id(subscription_id)
