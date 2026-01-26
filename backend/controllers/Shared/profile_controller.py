# controllers/profile_controller.py
from flask_jwt_extended import get_jwt_identity
from models.UserAccount import UserAccount
from models.Subscription import Subscription
from models.SubscriptionPlan import SubscriptionPlan
from models.Payment import Payment
from utils.email_service import email_service
from datetime import datetime, timedelta
from db import get_connection

def get_profile():
    """Fetch the logged-in user's profile."""
    email = get_jwt_identity()
    return UserAccount.find_by_email(email)

def update_profile(first_name: str, last_name: str):
    """Update the logged-in user's profile."""
    email = get_jwt_identity()
    return UserAccount.update_name(email, first_name, last_name)

def update_creator_youtube_channel(youtube_channel: str):
    email = get_jwt_identity()
    return UserAccount.set_creator_primary_channel(email, youtube_channel)

def get_subscription_info():
    """Get current subscription information for logged-in user."""
    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)
    
    if not user:
        return {"message": "User not found"}, 404
    
    subscription = Subscription.find_active_by_user_id(user.user_id)
    if not subscription:
        return {"message": "No active subscription found", "subscription": None, "plan": None, "payments": []}, 200
    
    plan = SubscriptionPlan.find_by_id(subscription.plan_id)
    payments = Payment.find_by_subscription_id(subscription.subscription_id)
    
    return {
        "subscription": subscription.to_dict(),
        "plan": plan.to_dict() if plan else None,
        "payments": [p.to_dict() for p in payments]
    }, 200

def update_subscription(new_plan_name: str):
    """Update subscription to a new plan."""
    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)
    
    if not user:
        return {"message": "User not found"}, 404
    
    # Find current active subscription
    current_subscription = Subscription.find_active_by_user_id(user.user_id)
    if not current_subscription:
        return {"message": "No active subscription found"}, 404
    
    # Find the new plan
    new_plan = SubscriptionPlan.find_by_name(new_plan_name)
    if not new_plan:
        return {"message": f"Plan '{new_plan_name}' not found"}, 404
    
    # Check if it's the same plan
    if current_subscription.plan_id == new_plan.plan_id:
        return {"message": "You are already subscribed to this plan"}, 400
    
    # Get current plan for email
    current_plan = SubscriptionPlan.find_by_id(current_subscription.plan_id)
    
    # Update subscription
    updated_subscription = Subscription.update_plan(current_subscription.subscription_id, new_plan.plan_id)
    if not updated_subscription:
        return {"message": "Failed to update subscription"}, 500
    
    # Create payment for the plan change
    # Calculate prorated amount (for simplicity, we'll charge the full new plan price)
    # In a real system, you'd calculate prorated amount based on remaining days
    payment = Payment.create(
        subscription_id=updated_subscription.subscription_id,
        amount=new_plan.price_monthly,
        currency="SGD",
        method="SIMULATED"
    )
    
    # Send email notification
    try:
        user_full_name = f"{user.first_name} {user.last_name}"
        email_service.send_subscription_update(
            user_email=user.email,
            user_name=user_full_name,
            old_plan_name=current_plan.name if current_plan else "Unknown",
            new_plan_name=new_plan.name,
            new_plan_price=new_plan.price_monthly,
            payment_id=payment.payment_id,
            subscription_id=updated_subscription.subscription_id
        )
    except Exception as e:
        print(f"⚠️  Failed to send subscription update email: {str(e)}")
    
    # Get updated info
    payments = Payment.find_by_subscription_id(updated_subscription.subscription_id)
    
    return {
        "message": "Subscription updated successfully",
        "subscription": updated_subscription.to_dict(),
        "plan": new_plan.to_dict(),
        "payment": payment.to_dict(),
        "payments": [p.to_dict() for p in payments]
    }, 200

def cancel_subscription():
    """Cancel the current active subscription."""
    email = get_jwt_identity()
    user = UserAccount.find_by_email(email)
    
    if not user:
        return {"message": "User not found"}, 404
    
    # Find current active subscription
    current_subscription = Subscription.find_active_by_user_id(user.user_id)
    if not current_subscription:
        return {"message": "No active subscription found"}, 404
    
    # Get plan info for email
    plan = SubscriptionPlan.find_by_id(current_subscription.plan_id)
    
    # Store all data needed for email BEFORE cancellation
    user_email = user.email
    user_full_name = f"{user.first_name} {user.last_name}"
    plan_name = plan.name if plan else "Unknown"
    subscription_id = current_subscription.subscription_id
    
    # Cancel subscription (this will delete the user)
    cancelled_subscription = Subscription.cancel_subscription(subscription_id)
    if not cancelled_subscription:
        return {"message": "Failed to cancel subscription"}, 500
    
    # Send email notification using the stored data
    try:
        email_service.send_subscription_cancellation(
            user_email=user_email,
            user_name=user_full_name,
            plan_name=plan_name,
            subscription_id=subscription_id,
            cancelled_at=cancelled_subscription.cancelled_at
        )
    except Exception as e:
        print(f"⚠️  Failed to send cancellation email: {str(e)}")
    
    return {
        "message": "Subscription cancelled successfully",
        "subscription": cancelled_subscription.to_dict()
    }, 200