from db import get_connection


class SubscriptionPlan:
    def __init__(self, plan_id, name, description, target_role, price_monthly, max_channels, max_saved_graphs, is_active):
        self.plan_id = plan_id
        self.name = name
        self.description = description
        self.target_role = target_role
        self.price_monthly = price_monthly
        self.max_channels = max_channels
        self.max_saved_graphs = max_saved_graphs
        self.is_active = is_active

    @classmethod
    def from_row(cls, row):
        if not row:
            return None
        return cls(
            plan_id=row["plan_id"],
            name=row["name"],
            description=row.get("description"),
            target_role=row.get("target_role", "BOTH"),
            price_monthly=float(row["price_monthly"]),
            max_channels=row.get("max_channels", 1),
            max_saved_graphs=row.get("max_saved_graphs", 5),
            is_active=bool(row.get("is_active", True))
        )

    def to_dict(self):
        return {
            "plan_id": self.plan_id,
            "name": self.name,
            "description": self.description,
            "target_role": self.target_role,
            "price_monthly": self.price_monthly,
            "max_channels": self.max_channels,
            "max_saved_graphs": self.max_saved_graphs,
            "is_active": self.is_active
        }

    @classmethod
    def find_by_name(cls, name):
        """Find a plan by name (e.g., 'Content Creator' or 'Business')"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT plan_id, name, description, target_role, price_monthly, 
                   max_channels, max_saved_graphs, is_active
            FROM SubscriptionPlan
            WHERE name = %s AND is_active = TRUE
        """, (name,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

    @classmethod
    def find_by_id(cls, plan_id):
        """Find a plan by plan_id"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT plan_id, name, description, target_role, price_monthly, 
                   max_channels, max_saved_graphs, is_active
            FROM SubscriptionPlan
            WHERE plan_id = %s AND is_active = TRUE
        """, (plan_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

    @classmethod
    def find_by_role(cls, role):
        """Find plans suitable for a role (creator, business, or BOTH)"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT plan_id, name, description, target_role, price_monthly, 
                   max_channels, max_saved_graphs, is_active
            FROM SubscriptionPlan
            WHERE (target_role = %s OR target_role = 'BOTH') 
            AND is_active = TRUE
            ORDER BY price_monthly ASC
        """, (role.upper(),))
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        return [cls.from_row(row) for row in rows]

    @classmethod
    def get_all_active(cls):
        """Get all active plans"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT plan_id, name, description, target_role, price_monthly, 
                   max_channels, max_saved_graphs, is_active
            FROM SubscriptionPlan
            WHERE is_active = TRUE
            ORDER BY price_monthly ASC
        """)
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        return [cls.from_row(row) for row in rows]
