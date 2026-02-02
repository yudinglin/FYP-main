from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.SupportTicket import SupportTicket
from models.SupportResponse import SupportResponse
from models.UserAccount import UserAccount
from utils.email_service import email_service


def submit_ticket(request):
    data = request.get_json() or {}

    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()
    category = (data.get("category") or "").strip()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()

    if not subject or not message:
        return {"message": "Subject and message are required"}, 400

    # Try to pull the user from a JWT if provided; otherwise allow guest.
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:
        identity = None

    if identity:
        user = UserAccount.find_by_email(identity)
        if user:
            user_id = user.user_id
            name = name or f"{user.first_name} {user.last_name}".strip()
            email = email or user.email

    if not user_id and (not name or not email):
        return {"message": "Name and email are required for guest requests"}, 400

    ticket = SupportTicket.create(
        subject=subject,
        message=message,
        user_id=user_id,
        name=name or None,
        email=email or None,
        category=category or None,
    )

    if not ticket:
        return {"message": "Unable to create support ticket"}, 500

    return {
        "message": "Support request submitted successfully",
        "ticket": ticket.to_dict(),
    }, 201


def get_all_tickets():
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = UserAccount.find_by_email(identity)
        if not user or user.role.lower() != 'admin':
            return {"message": "Admin access required"}, 403

        tickets = SupportTicket.get_all()
        tickets_data = []
        for ticket in tickets:
            responses = SupportResponse.get_by_ticket_id(ticket.ticket_id)
            ticket_dict = ticket.to_dict()
            ticket_dict['responses'] = [r.to_dict() for r in responses]
            tickets_data.append(ticket_dict)
        
        return {"tickets": tickets_data}, 200
    except Exception as e:
        return {"message": f"Error retrieving tickets: {str(e)}"}, 500


def respond_to_ticket(request, ticket_id):
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = UserAccount.find_by_email(identity)
        if not user or user.role.lower() != 'admin':
            return {"message": "Admin access required"}, 403

        data = request.get_json() or {}
        message = (data.get("message") or "").strip()
        
        if not message:
            return {"message": "Response message is required"}, 400

        # Check if ticket exists
        ticket = SupportTicket.get_by_id(ticket_id)
        if not ticket:
            return {"message": "Ticket not found"}, 404

        # Create response
        responses = SupportResponse.create(ticket_id, user.user_id, message)
        
        # Update ticket status to ANSWERED
        SupportTicket.update_status(ticket_id, 'ANSWERED')
        
        # Send email notification to the user
        try:
            # Determine user name and email
            user_name = ticket.name or "User"
            user_email = ticket.email
            
            # If ticket has a user_id, get the registered user's info
            if ticket.user_id:
                ticket_user = UserAccount.find_by_id(ticket.user_id)
                if ticket_user:
                    user_name = f"{ticket_user.first_name} {ticket_user.last_name}".strip() or ticket_user.email
                    user_email = ticket_user.email
            
            # Send email notification
            if user_email:
                email_service.send_support_response(
                    user_email=user_email,
                    user_name=user_name,
                    ticket_subject=ticket.subject,
                    original_message=ticket.message,
                    admin_response=message,
                    ticket_id=ticket.ticket_id
                )
                print(f"✅ Support response email sent to {user_email}")
            else:
                print("⚠️  No email address found for ticket user")
                
        except Exception as email_error:
            print(f"❌ Error sending support response email: {str(email_error)}")
            # Don't fail the response creation if email fails
        
        return {
            "message": "Response submitted successfully",
            "responses": [r.to_dict() for r in responses]
        }, 200
    except Exception as e:
        return {"message": f"Error submitting response: {str(e)}"}, 500
    
def get_my_tickets():
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = UserAccount.find_by_email(identity)

        if not user:
            return {"message": "Unauthorized"}, 401

        tickets = SupportTicket.get_by_user_id(user.user_id)

        tickets_data = []
        for ticket in tickets:
            responses = SupportResponse.get_by_ticket_id(ticket.ticket_id)
            ticket_dict = ticket.to_dict()
            ticket_dict["responses"] = [r.to_dict() for r in responses]
            tickets_data.append(ticket_dict)

        return {"tickets": tickets_data}, 200

    except Exception as e:
        return {"message": f"Error retrieving tickets: {str(e)}"}, 500

