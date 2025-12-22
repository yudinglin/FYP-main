from db import get_connection
from datetime import datetime, timedelta


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

    @classmethod
    def create(cls, user_id, plan_id):
        """Create a new subscription for a user"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Calculate end_date (1 month from now)
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
        """Find a subscription by ID"""
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
        """Find active subscription for a user"""
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
