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

    @classmethod
    def get_all(cls):
        """Get all plans (including inactive) - for admin use"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT plan_id, name, description, target_role, price_monthly, 
                   max_channels, max_saved_graphs, is_active
            FROM SubscriptionPlan
            ORDER BY price_monthly ASC
        """)
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        return [cls.from_row(row) for row in rows]

    @classmethod
    def update(cls, plan_id, name=None, description=None, target_role=None, 
               price_monthly=None, max_channels=None, max_saved_graphs=None, is_active=None):
        """Update a subscription plan"""
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Build dynamic update query
        updates = []
        params = []

        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        if target_role is not None:
            updates.append("target_role = %s")
            params.append(target_role.upper())
        if price_monthly is not None:
            updates.append("price_monthly = %s")
            params.append(price_monthly)
        if max_channels is not None:
            updates.append("max_channels = %s")
            params.append(max_channels)
        if max_saved_graphs is not None:
            updates.append("max_saved_graphs = %s")
            params.append(max_saved_graphs)
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(bool(is_active))

        if not updates:
            cursor.close()
            conn.close()
            return None

        params.append(plan_id)
        query = f"""
            UPDATE SubscriptionPlan
            SET {', '.join(updates)}
            WHERE plan_id = %s
        """
        cursor.execute(query, params)
        conn.commit()

        # Fetch and return updated plan
        cursor.execute("""
            SELECT plan_id, name, description, target_role, price_monthly, 
                   max_channels, max_saved_graphs, is_active
            FROM SubscriptionPlan
            WHERE plan_id = %s
        """, (plan_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()
        return cls.from_row(row)

