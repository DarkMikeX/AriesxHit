# Email Service - handles email sending
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.username = None
        self.password = None

    def send_email(self, to_email, subject, body, html_body=None):
        """Send email"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.username or "ariesxhit@service.com"
            msg['To'] = to_email

            # Plain text version
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)

            # HTML version if provided
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)

            # Note: Actual SMTP sending would require credentials
            # For now, just log the email
            print(f"📧 Email would be sent to {to_email}")
            print(f"   Subject: {subject}")
            print(f"   Body: {body[:100]}...")

            return True

        except Exception as e:
            print(f"❌ Email sending failed: {e}")
            return False