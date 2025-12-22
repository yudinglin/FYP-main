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
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
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


# Global instance
email_service = EmailService()
