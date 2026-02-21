# Bypasser Module

Bypass-related scripts for future use. Not currently loaded by the extension.

## Files

- **core/bypass.js** – Fingerprint removal + card replacement (injected)
- **core/stripe-interceptor.js** – WebRequest-based Stripe interception
- **core/response-parser.js** – Stripe response parsing
- **content/response-interceptor.js** – Response interception & parsing
- **content/stripe-detector.js** – Stripe checkout detection, 2D/3D notification

## Enabling

To use the bypasser, add these scripts to `manifest.json` and wire them to the background/autohitter flow.
