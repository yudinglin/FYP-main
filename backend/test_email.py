#!/usr/bin/env python3
"""
Quick test script to check email configuration and try sending a test email
"""
import os
from dotenv import load_dotenv
from utils.email_service import email_service

load_dotenv()

print("=" * 50)
print("Email Configuration Test")
print("=" * 50)

# Check configuration
print("\n1. Checking .env configuration:")
print(f"   SMTP_SERVER: {os.getenv('SMTP_SERVER', 'NOT FOUND')}")
print(f"   SMTP_PORT: {os.getenv('SMTP_PORT', 'NOT FOUND')}")
print(f"   SMTP_USERNAME: {os.getenv('SMTP_USERNAME', 'NOT FOUND')}")
password_set = bool(os.getenv('SMTP_PASSWORD'))
print(f"   SMTP_PASSWORD: {'✅ Set (' + str(len(os.getenv('SMTP_PASSWORD', ''))) + ' chars)' if password_set else '❌ NOT FOUND'}")
print(f"   FROM_EMAIL: {os.getenv('FROM_EMAIL', 'NOT FOUND')}")
print(f"   FROM_NAME: {os.getenv('FROM_NAME', 'NOT FOUND')}")

# Check email service initialization
print("\n2. Email Service Status:")
print(f"   Server: {email_service.smtp_server}:{email_service.smtp_port}")
print(f"   Username: {email_service.smtp_username}")
print(f"   From Email: {email_service.from_email}")

if not password_set or not email_service.smtp_username:
    print("\n❌ Email configuration incomplete!")
    print("   Please check your .env file and restart the server.")
else:
    print("\n✅ Configuration looks good!")
    
    # Ask if user wants to test sending
    print("\n3. Test Email Send:")
    test_email = input("   Enter your email to send a test email (or press Enter to skip): ").strip()
    
    if test_email:
        print(f"\n   Sending test email to {test_email}...")
        success = email_service.send_registration_invoice(
            user_email=test_email,
            user_name="Test User",
            plan_name="Test Plan",
            plan_price=12.00,
            payment_id=999,
            subscription_id=999
        )
        
        if success:
            print(f"\n✅ Test email sent successfully!")
            print(f"   Check your inbox at {test_email}")
        else:
            print(f"\n❌ Failed to send test email.")
            print(f"   Check the error message above for details.")
    else:
        print("   Skipped test email send.")

print("\n" + "=" * 50)
