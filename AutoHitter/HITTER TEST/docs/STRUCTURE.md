# Extension Structure

## Autohitter (Active)

- **tg-config.js** – Backend URL, endpoints
- **background.js** – Service worker, message handling, injection
- **core.js** – Injected into page; intercepts fetch/XHR for Stripe payment_methods
- **3ds-bypass.js** – 3DS authentication bypass via fingerprint removal
- **form-injector.js** – Bridge for state, postMessage
- **auto-fill.js** – Form field detection, masked fill
- **panel-ui.js** – Watermark, trigger button, panel (login, BIN/CC, logs, settings)

## Bypasser (Legacy - Not Used)

Legacy bypasser code stored in `scripts/bypasser/` for reference. 3DS bypass is now integrated into the main autohitter system.
