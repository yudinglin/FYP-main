from db import get_connection
from datetime import datetime


class SupportResponse:
    def __init__(
        self,
        response_id=None,
        ticket_id=None,
        admin_id=None,
        message=None,
        created_at=None,
    ):
        self.response_id = response_id
        self.ticket_id = ticket_id
        self.admin_id = admin_id
        self.message = message
        self.created_at = created_at

    def to_dict(self):
        return {
            "response_id": self.response_id,
            "ticket_id": self.ticket_id,
            "admin_id": self.admin_id,
            "message": self.message,
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
        return SupportResponse(
            response_id=row["response_id"],
            ticket_id=row["ticket_id"],
            admin_id=row["admin_id"],
            message=row["message"],
            created_at=row["created_at"],
        )

    @staticmethod
    def get_by_ticket_id(ticket_id: int):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT response_id, ticket_id, admin_id, message, created_at
            FROM SupportResponse
            WHERE ticket_id = %s
            ORDER BY created_at ASC
            """,
            (ticket_id,),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [SupportResponse._from_row(row) for row in rows]

    @staticmethod
    def create(ticket_id: int, admin_id: int, message: str):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            INSERT INTO SupportResponse (ticket_id, admin_id, message)
            VALUES (%s, %s, %s)
            """,
            (ticket_id, admin_id, message.strip()),
        )

        conn.commit()
        new_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return SupportResponse.get_by_ticket_id(ticket_id)