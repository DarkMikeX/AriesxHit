# Extension Structure

## Autohitter (Active)

- **tg-config.js** – Backend URL, endpoints
- **background.js** – Service worker, message handling, injection
- **core.js** – Injected into page; intercepts fetch/XHR for Stripe payment_methods
- **form-injector.js** – Bridge for state, postMessage
- **auto-fill.js** – Form field detection, masked fill
- **panel-ui.js** – Watermark, trigger button, panel (login, BIN/CC, logs, settings)

## Bypasser (Dormant)

Stored in `scripts/bypasser/` for future integration. Not loaded by manifest.
