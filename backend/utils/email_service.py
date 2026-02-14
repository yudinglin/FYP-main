import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    def __init__(self):
        # Email configuration from environment variables
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "YouAnalyze")

    def send_email(self, to_email, subject, html_body, text_body=None):
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text version (optional, auto-generated if not provided)
        """
        if not self.smtp_username or not self.smtp_password:
            print("⚠️  Email not configured. Skipping email send.")
            print(f"   Would send to: {to_email}, Subject: {subject}")
            return False

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            # Add plain text version if provided
            if text_body:
                part1 = MIMEText(text_body, "plain")
                msg.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_body, "html")
            msg.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            print(f"✅ Email sent successfully to {to_email}")
            return True

        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error sending email to {to_email}: {error_msg}")
            # More detailed error info for debugging
            if "authentication failed" in error_msg.lower() or "invalid credentials" in error_msg.lower():
                print("   → Check your App Password (16 characters, no regular password)")
                print("   → Make sure 2-Step Verification is enabled")
            elif "connection" in error_msg.lower():
                print("   → Check your internet connection and SMTP server settings")
            return False

    def send_registration_invoice(self, user_email, user_name, plan_name, plan_price, payment_id, subscription_id):
        """
        Send registration confirmation and invoice email
        """
        subject = f"Welcome to YouAnalyze - Registration Confirmation & Invoice"

        # Format price
        formatted_price = f"${plan_price:.2f}"

        # Current date
        invoice_date = datetime.now().strftime("%B %d, %Y")

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 3px solid #dc2626;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    color: #dc2626;
                    margin: 0;
                    font-size: 28px;
                }}
                .success-badge {{
                    background-color: #10b981;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    display: inline-block;
                    margin-bottom: 20px;
                    font-weight: bold;
                }}
                .invoice-details {{
                    background-color: #f9fafb;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .invoice-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .invoice-row:last-child {{
                    border-bottom: none;
                    font-weight: bold;
                    font-size: 18px;
                    color: #dc2626;
                    margin-top: 10px;
                    padding-top: 15px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #dc2626;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 YouAnalyze</h1>
                </div>

                <div class="success-badge">✓ Successfully Registered!</div>

                <p>Dear {user_name},</p>

                <p>Thank you for registering with YouAnalyze! We're excited to have you on board.</p>

                <p><strong>Your registration is complete and your subscription is now active.</strong></p>

                <div class="invoice-details">
                    <h2 style="margin-top: 0; color: #dc2626;">Invoice & Subscription Details</h2>
                    
                    <div class="invoice-row">
                        <span><strong>Subscription Plan:</strong></span>
                        <span>{plan_name}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Payment Amount:</strong></span>
                        <span>{formatted_price}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Billing Cycle:</strong></span>
                        <span>Monthly</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Invoice Date:</strong></span>
                        <span>{invoice_date}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Payment ID:</strong></span>
                        <span>#{payment_id}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Subscription ID:</strong></span>
                        <span>#{subscription_id}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Payment Status:</strong></span>
                        <span>✅ Paid</span>
                    </div>
                </div>

                <p style="margin-top: 30px;">
                    <strong>What's next?</strong><br>
                    You can now log in to your account and start exploring all the features available in your plan.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5174/login" class="button">Login to Your Dashboard</a>
                </div>

                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

                <p>Best regards,<br>
                <strong>The YouAnalyze Team</strong></p>

                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>&copy; {datetime.now().year} YouAnalyze. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
YouAnalyze - Registration Confirmation & Invoice

Dear {user_name},

Thank you for registering with YouAnalyze! We're excited to have you on board.

Your registration is complete and your subscription is now active.

Invoice & Subscription Details:
- Subscription Plan: {plan_name}
- Payment Amount: {formatted_price}
- Billing Cycle: Monthly
- Invoice Date: {invoice_date}
- Payment ID: #{payment_id}
- Subscription ID: #{subscription_id}
- Payment Status: Paid

What's next?
You can now log in to your account and start exploring all the features available in your plan.

Login here: http://localhost:5174/login

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The YouAnalyze Team

---
This is an automated email. Please do not reply to this message.
© {datetime.now().year} YouAnalyze. All rights reserved.
        """

        return self.send_email(user_email, subject, html_body, text_body)

    def send_subscription_update(self, user_email, user_name, old_plan_name, new_plan_name, new_plan_price, payment_id, subscription_id):
        """
        Send subscription plan change confirmation email
        """
        subject = f"YouAnalyze - Subscription Plan Updated"

        formatted_price = f"${new_plan_price:.2f}"
        update_date = datetime.now().strftime("%B %d, %Y")

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 3px solid #dc2626;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    color: #dc2626;
                    margin: 0;
                    font-size: 28px;
                }}
                .update-badge {{
                    background-color: #3b82f6;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    display: inline-block;
                    margin-bottom: 20px;
                    font-weight: bold;
                }}
                .plan-change {{
                    background-color: #f9fafb;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #3b82f6;
                }}
                .plan-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .plan-row:last-child {{
                    border-bottom: none;
                }}
                .invoice-details {{
                    background-color: #f9fafb;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .invoice-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .invoice-row:last-child {{
                    border-bottom: none;
                    font-weight: bold;
                    font-size: 18px;
                    color: #dc2626;
                    margin-top: 10px;
                    padding-top: 15px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #dc2626;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 YouAnalyze</h1>
                </div>

                <div class="update-badge">✓ Subscription Updated!</div>

                <p>Dear {user_name},</p>

                <p>Your subscription plan has been successfully updated.</p>

                <div class="plan-change">
                    <h2 style="margin-top: 0; color: #3b82f6;">Plan Change Details</h2>
                    <div class="plan-row">
                        <span><strong>Previous Plan:</strong></span>
                        <span>{old_plan_name}</span>
                    </div>
                    <div class="plan-row">
                        <span><strong>New Plan:</strong></span>
                        <span style="color: #10b981; font-weight: bold;">{new_plan_name}</span>
                    </div>
                    <div class="plan-row">
                        <span><strong>Update Date:</strong></span>
                        <span>{update_date}</span>
                    </div>
                </div>

                <div class="invoice-details">
                    <h2 style="margin-top: 0; color: #dc2626;">Payment Details</h2>
                    <div class="invoice-row">
                        <span><strong>New Plan Price:</strong></span>
                        <span>{formatted_price}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Payment ID:</strong></span>
                        <span>#{payment_id}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Subscription ID:</strong></span>
                        <span>#{subscription_id}</span>
                    </div>
                    <div class="invoice-row">
                        <span><strong>Payment Status:</strong></span>
                        <span>✅ Paid</span>
                    </div>
                </div>

                <p style="margin-top: 30px;">
                    Your new plan is now active. You can access all features available in the <strong>{new_plan_name}</strong> plan.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5174/profile" class="button">View Your Profile</a>
                </div>

                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

                <p>Best regards,<br>
                <strong>The YouAnalyze Team</strong></p>

                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>&copy; {datetime.now().year} YouAnalyze. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
YouAnalyze - Subscription Plan Updated

Dear {user_name},

Your subscription plan has been successfully updated.

Plan Change Details:
- Previous Plan: {old_plan_name}
- New Plan: {new_plan_name}
- Update Date: {update_date}

Payment Details:
- New Plan Price: {formatted_price}
- Payment ID: #{payment_id}
- Subscription ID: #{subscription_id}
- Payment Status: Paid

Your new plan is now active. You can access all features available in the {new_plan_name} plan.

View your profile: http://localhost:5174/profile

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The YouAnalyze Team

---
This is an automated email. Please do not reply to this message.
© {datetime.now().year} YouAnalyze. All rights reserved.
        """

        return self.send_email(user_email, subject, html_body, text_body)

    def send_subscription_cancellation(self, user_email, user_name, plan_name, subscription_id, cancelled_at):
        """
        Send subscription cancellation confirmation email
        """
        subject = f"YouAnalyze - Subscription Cancelled"

        cancellation_date = cancelled_at.strftime("%B %d, %Y") if isinstance(cancelled_at, datetime) else str(cancelled_at)

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 3px solid #dc2626;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    color: #dc2626;
                    margin: 0;
                    font-size: 28px;
                }}
                .cancellation-badge {{
                    background-color: #ef4444;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    display: inline-block;
                    margin-bottom: 20px;
                    font-weight: bold;
                }}
                .cancellation-details {{
                    background-color: #fef2f2;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #ef4444;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #fee2e2;
                }}
                .detail-row:last-child {{
                    border-bottom: none;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #dc2626;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 YouAnalyze</h1>
                </div>

                <div class="cancellation-badge">Subscription Cancelled</div>

                <p>Dear {user_name},</p>

                <p>We're sorry to see you go. Your subscription has been cancelled as requested.</p>

                <div class="cancellation-details">
                    <h2 style="margin-top: 0; color: #dc2626;">Cancellation Details</h2>
                    <div class="detail-row">
                        <span><strong>Plan:</strong></span>
                        <span>{plan_name}</span>
                    </div>
                    <div class="detail-row">
                        <span><strong>Subscription ID:</strong></span>
                        <span>#{subscription_id}</span>
                    </div>
                    <div class="detail-row">
                        <span><strong>Cancellation Date:</strong></span>
                        <span>{cancellation_date}</span>
                    </div>
                    <div class="detail-row">
                        <span><strong>Status:</strong></span>
                        <span>CANCELLED</span>
                    </div>
                </div>

                <p style="margin-top: 30px;">
                    Your subscription access will remain active until the end of your current billing period. 
                    After that, you will no longer have access to premium features.
                </p>

                <p>
                    If you change your mind, you can reactivate your subscription at any time by visiting your profile page.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5174/profile" class="button">View Your Profile</a>
                </div>

                <p>We'd love to hear your feedback about why you cancelled. If you have a moment, please let us know how we can improve.</p>

                <p>Thank you for being part of YouAnalyze. We hope to serve you again in the future.</p>

                <p>Best regards,<br>
                <strong>The YouAnalyze Team</strong></p>

                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>&copy; {datetime.now().year} YouAnalyze. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
YouAnalyze - Subscription Cancelled

Dear {user_name},

We're sorry to see you go. Your subscription has been cancelled as requested.

Cancellation Details:
- Plan: {plan_name}
- Subscription ID: #{subscription_id}
- Cancellation Date: {cancellation_date}
- Status: CANCELLED

Your subscription access will remain active until the end of your current billing period. 
After that, you will no longer have access to premium features.

If you change your mind, you can reactivate your subscription at any time by visiting your profile page.

View your profile: http://localhost:5174/profile

We'd love to hear your feedback about why you cancelled. If you have a moment, please let us know how we can improve.

Thank you for being part of YouAnalyze. We hope to serve you again in the future.

Best regards,
The YouAnalyze Team

---
This is an automated email. Please do not reply to this message.
© {datetime.now().year} YouAnalyze. All rights reserved.
        """

        return self.send_email(user_email, subject, html_body, text_body)

    def send_support_response(self, user_email, user_name, ticket_subject, original_message, admin_response, ticket_id):
        """
        Send support response notification email to user
        """
        subject = f"YouAnalyze Support - Response to: {ticket_subject}"

        response_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 3px solid #dc2626;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    color: #dc2626;
                    margin: 0;
                    font-size: 28px;
                }}
                .response-badge {{
                    background-color: #10b981;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    display: inline-block;
                    margin-bottom: 20px;
                    font-weight: bold;
                }}
                .ticket-info {{
                    background-color: #f9fafb;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #6b7280;
                }}
                .response-section {{
                    background-color: #ecfdf5;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #10b981;
                }}
                .original-message {{
                    background-color: #f8fafc;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                    border-left: 3px solid #cbd5e1;
                    font-style: italic;
                    color: #64748b;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #dc2626;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-weight: bold;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💬 YouAnalyze Support</h1>
                </div>

                <div class="response-badge">✓ New Response Available</div>

                <p>Dear {user_name},</p>

                <p>Great news! Our support team has responded to your support request.</p>

                <div class="ticket-info">
                    <h2 style="margin-top: 0; color: #374151;">Ticket Information</h2>
                    <div class="info-row">
                        <span><strong>Ticket ID:</strong></span>
                        <span>#{ticket_id}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Subject:</strong></span>
                        <span>{ticket_subject}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Response Date:</strong></span>
                        <span>{response_date}</span>
                    </div>
                </div>

                <div class="response-section">
                    <h2 style="margin-top: 0; color: #059669;">Support Team Response</h2>
                    <p style="margin: 0; white-space: pre-wrap;">{admin_response}</p>
                </div>

                <div class="original-message">
                    <h3 style="margin-top: 0; color: #64748b; font-size: 14px;">Your Original Message:</h3>
                    <p style="margin: 0; white-space: pre-wrap;">{original_message}</p>
                </div>

                <p style="margin-top: 30px;">
                    If you have any follow-up questions or need additional assistance, please feel free to submit a new support request.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5174/contact-support" class="button">Contact Support Again</a>
                </div>

                <p>Thank you for using YouAnalyze. We're here to help!</p>

                <p>Best regards,<br>
                <strong>The YouAnalyze Support Team</strong></p>

                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>For additional support, please visit our contact support page.</p>
                    <p>&copy; {datetime.now().year} YouAnalyze. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
YouAnalyze Support - Response to: {ticket_subject}

Dear {user_name},

Great news! Our support team has responded to your support request.

Ticket Information:
- Ticket ID: #{ticket_id}
- Subject: {ticket_subject}
- Response Date: {response_date}

Support Team Response:
{admin_response}

Your Original Message:
{original_message}

If you have any follow-up questions or need additional assistance, please feel free to submit a new support request.

Contact Support: http://localhost:5174/contact-support

Thank you for using YouAnalyze. We're here to help!

Best regards,
The YouAnalyze Support Team

---
This is an automated email. Please do not reply to this message.
For additional support, please visit our contact support page.
© {datetime.now().year} YouAnalyze. All rights reserved.
        """

        return self.send_email(user_email, subject, html_body, text_body)


# Global instance
email_service = EmailService()

