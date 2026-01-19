from db import get_connection
from datetime import datetime


class Payment:
    def __init__(self, payment_id, subscription_id, amount, currency, payment_date, status, method=None):
        self.payment_id = payment_id
        self.subscription_id = subscription_id
        self.amount = amount
        self.currency = currency
        self.payment_date = payment_date
        self.status = status
        self.method = method

    @classmethod
    def from_row(cls, row):
        if not row:
            return None
        return cls(
            payment_id=row["payment_id"],
            subscription_id=row["subscription_id"],
            amount=float(row["amount"]),
            currency=row.get("currency", "SGD"),
            payment_date=row["payment_date"],
            status=row["status"],
            method=row.get("method")
        )

    def to_dict(self):
        return {
            "payment_id": self.payment_id,
            "subscription_id": self.subscription_id,
            "amount": self.amount,
            "currency": self.currency,
            "payment_date": self.payment_date.isoformat() if isinstance(self.payment_date, datetime) else str(self.payment_date),
            "status": self.status,
            "method": self.method
        }

    @classmethod
    def create(cls, subscription_id, amount, currency="SGD", method="SIMULATED"):
        """Create a new payment record (simulated payment)"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        payment_date = datetime.now()

        cursor.execute("""
            INSERT INTO Payment (subscription_id, amount, currency, payment_date, status, method)
            VALUES (%s, %s, %s, %s, 'SUCCESS', %s)
        """, (subscription_id, amount, currency, payment_date, method))
        conn.commit()

        payment_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return cls.find_by_id(payment_id)

    @classmethod
    def find_by_id(cls, payment_id):
        """Find a payment by ID"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT payment_id, subscription_id, amount, currency, payment_date, status, method
            FROM Payment
            WHERE payment_id = %s
        """, (payment_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

