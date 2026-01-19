from models.UserAccount import UserAccount
from models.SubscriptionPlan import SubscriptionPlan
from models.Subscription import Subscription
from models.Payment import Payment
from utils.email_service import email_service


def get_plans():
    """Get all active subscription plans"""
    plans = SubscriptionPlan.get_all_active()
    return {"plans": [plan.to_dict() for plan in plans]}, 200


def process_payment_and_register(request):
    """
    Process payment (simulated) and register user with subscription.
    This combines registration, subscription creation, and payment in one transaction.
    """
    data = request.get_json() or {}

    # Registration data
    email = data.get("email")
    password = data.get("password")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    role = data.get("role")  # "creator" or "business"
    
    # Payment data
    plan_name = data.get("plan_name")  # "Content Creator" or "Business"

    # Validation
    if not all([email, password, first_name, last_name, role, plan_name]):
        return {"message": "All fields are required"}, 400

    # Check if user already exists
    if UserAccount.find_by_email(email):
        return {"message": "Email already registered"}, 409

    # Find the plan by name
    plan = SubscriptionPlan.find_by_name(plan_name)
    if not plan:
        return {"message": f"Plan '{plan_name}' not found"}, 404

    # Validate role matches plan
    if plan.target_role != "BOTH" and plan.target_role.upper() != role.upper():
        return {"message": f"Plan '{plan_name}' is not available for role '{role}'"}, 400

    # Import here to avoid circular imports
    from db import get_connection
    from werkzeug.security import generate_password_hash
    from datetime import datetime, timedelta
    import mysql.connector

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Start transaction: Register user, create subscription, create payment
        
        # 1. Create User
        hashed_pw = generate_password_hash(password)
        cursor.execute(
            """
            INSERT INTO User (email, password_hash, first_name, last_name, role)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (email, hashed_pw, first_name, last_name, role),
        )
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
                (user_id, f"{first_name} {last_name}", None)
            )

        # 3. Create subscription
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)
        
        cursor.execute("""
            INSERT INTO Subscription (user_id, plan_id, status, start_date, end_date)
            VALUES (%s, %s, 'ACTIVE', %s, %s)
        """, (user_id, plan.plan_id, start_date, end_date))
        
        subscription_id = cursor.lastrowid

        # 4. Create payment (simulated - always SUCCESS)
        payment_date = start_date
        cursor.execute("""
            INSERT INTO Payment (subscription_id, amount, currency, payment_date, status, method)
            VALUES (%s, %s, 'SGD', %s, 'SUCCESS', 'SIMULATED')
        """, (subscription_id, plan.price_monthly, payment_date))

        payment_id = cursor.lastrowid

        # Commit all changes
        conn.commit()

        # Fetch the created user
        cursor.execute("""
            SELECT user_id, email, password_hash, first_name, last_name, role, status
            FROM User WHERE user_id = %s
        """, (user_id,))
        user_row = cursor.fetchone()
        user = UserAccount.from_row(user_row)

        cursor.close()
        conn.close()

        # Send registration confirmation and invoice email
        try:
            user_full_name = f"{first_name} {last_name}"
            email_service.send_registration_invoice(
                user_email=email,
                user_name=user_full_name,
                plan_name=plan.name,
                plan_price=plan.price_monthly,
                payment_id=payment_id,
                subscription_id=subscription_id
            )
        except Exception as e:
            # Log error but don't fail the registration if email fails
            print(f"⚠️  Failed to send confirmation email: {str(e)}")

        return {
            "message": "Payment successful and successfully registered",
            "user": user.to_dict(),
            "subscription_id": subscription_id,
            "payment_id": payment_id,
            "plan": plan.to_dict()
        }, 201

    except mysql.connector.Error as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return {"message": f"Database error: {str(e)}"}, 500
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return {"message": f"Error: {str(e)}"}, 500

