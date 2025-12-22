from db import get_connection
from datetime import datetime


class SupportTicket:
    def __init__(
        self,
        ticket_id=None,
        user_id=None,
        name=None,
        email=None,
        subject=None,
        message=None,
        status="OPEN",
        created_at=None,
    ):
        self.ticket_id = ticket_id
        self.user_id = user_id
        self.name = name
        self.email = email
        self.subject = subject
        self.message = message
        self.status = status
        self.created_at = created_at

    def to_dict(self):
        return {
            "ticket_id": self.ticket_id,
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "status": self.status,
            "created_at": (
                self.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if isinstance(self.created_at, datetime)
                else self.created_at
            ),
        }

    @staticmethod
    def _from_row(row):
        if not row:
            return None
        return SupportTicket(
            ticket_id=row["ticket_id"],
            user_id=row["user_id"],
            name=row["name"],
            email=row["email"],
            subject=row["subject"],
            message=row["message"],
            status=row["status"],
            created_at=row["created_at"],
        )

    @staticmethod
    def get_by_id(ticket_id: int):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT ticket_id, user_id, name, email, subject, message, status, created_at
            FROM SupportTicket
            WHERE ticket_id = %s
            """,
            (ticket_id,),
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return SupportTicket._from_row(row)

    @staticmethod
    def create(subject, message, user_id=None, name=None, email=None, category=None):
        """
        Insert a new support ticket. Category is optional and, if provided,
        is prefixed to the subject for easier triage without changing schema.
        """
        stored_subject = (
            f"[{category}] {subject.strip()}" if category else subject.strip()
        )

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            INSERT INTO SupportTicket (user_id, name, email, subject, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, name or None, email or None, stored_subject, message.strip()),
        )

        conn.commit()
        new_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return SupportTicket.get_by_id(new_id)
