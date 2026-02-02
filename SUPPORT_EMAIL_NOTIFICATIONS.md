# Support Email Notifications

This document explains the email notification system for support ticket responses.

## Overview

When an admin responds to a support ticket, the system automatically sends an email notification to the user who submitted the ticket. This works for both registered users and unregistered users who provided their email when submitting the support request.

## How It Works

### 1. Support Ticket Submission
- Users (registered or unregistered) submit support tickets via the contact form
- For unregistered users, name and email are required fields
- For registered users, name and email are automatically populated from their account

### 2. Admin Response
- Admins can view all support tickets in the admin panel
- When an admin responds to a ticket, the system:
  1. Creates the response record in the database
  2. Updates the ticket status to "ANSWERED"
  3. Sends an email notification to the user

### 3. Email Notification
The email notification includes:
- **Subject**: "YouAnalyze Support - Response to: [Original Subject]"
- **User's name** (from ticket or user account)
- **Ticket information** (ID, subject, response date)
- **Admin's response** (formatted with proper styling)
- **Original user message** (for context)
- **Link to contact support again** if needed

## Technical Implementation

### Files Modified/Created

1. **`backend/utils/email_service.py`**
   - Added `send_support_response()` method
   - Creates HTML and plain text email templates
   - Handles email sending with proper error handling

2. **`backend/controllers/Shared/support_controller.py`**
   - Modified `respond_to_ticket()` function
   - Added email notification logic after creating response
   - Handles both registered and unregistered users
   - Graceful error handling (email failure doesn't break response creation)

3. **Email Templates**
   - Professional HTML email with YouAnalyze branding
   - Responsive design with proper styling
   - Plain text fallback for email clients that don't support HTML

### User Identification Logic

```python
# Determine user name and email
user_name = ticket.name or "User"
user_email = ticket.email

# If ticket has a user_id, get the registered user's info
if ticket.user_id:
    ticket_user = UserAccount.find_by_id(ticket.user_id)
    if ticket_user:
        user_name = f"{ticket_user.first_name} {ticket_user.last_name}".strip() or ticket_user.email
        user_email = ticket_user.email
```

## Email Configuration

The system uses the existing email service configuration from `.env`:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=YouAnalyze
```

## Testing

A test script is provided at `backend/test_support_email.py` to verify email functionality:

```bash
cd backend
python test_support_email.py
```

## Error Handling

- Email failures are logged but don't prevent response creation
- If no email address is found, a warning is logged
- SMTP errors are caught and logged with helpful debugging information

## User Experience

### For Unregistered Users
1. Submit support ticket with name and email
2. Receive confirmation that ticket was submitted
3. Get email notification when admin responds
4. Can submit new tickets for follow-up questions

### For Registered Users
1. Submit support ticket (name/email auto-filled)
2. Can view ticket responses in their account
3. Also receive email notifications for immediate awareness
4. Can continue conversation through the platform

## Benefits

- **Immediate notification**: Users know when their support request is answered
- **No login required**: Unregistered users get responses via email
- **Professional appearance**: Branded email templates maintain company image
- **Context preservation**: Original message included for reference
- **Accessibility**: Works for all users regardless of registration status

## Future Enhancements

Potential improvements could include:
- Email threading for follow-up responses
- Customizable email templates per category
- SMS notifications for urgent tickets
- Auto-response acknowledgments when tickets are submitted