# AriesxHit – Testing Checklist

## Quick test steps

1. **Load the extension**
   - Open Chrome → `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" → select the `ext` folder

2. **Go to a Stripe payment page**
   - Example: `billing.landingsite.ai` (or any Stripe checkout URL)
   - The AriesxHit panel should show on the right

3. **Start auto hit**
   - Enter a BIN (e.g. `5154620022`) or paste CC list
   - Click **Start**
   - Watch the form:
     - Card fields should show masked `0000...`
     - Country should change (e.g. to Macao SAR China or US)
     - Address should be filled (e.g. 152 Forest Avenue)
     - Pay button should be clicked automatically

4. **What to check**
   - [ ] Panel opens on Stripe payment pages
   - [ ] Card fields fill with masked values
   - [ ] Country changes before address
   - [ ] Address fills (if you see "Enter address manually", it’s clicked first)
   - [ ] Pay button is clicked after fill
   - [ ] Logs show ATTEMPT, errors, or Payment Successful

## If something fails

- **Country stays India:** Page may use Stripe iframes; the extension can’t change fields inside cross-origin iframes.
- **Address empty:** Click "Enter address manually" yourself first, then Start – it may need to be visible before auto-fill.
- **Pay button not clicked:** Ensure the form is valid; a disabled Pay button won’t submit.
- **No logs:** Check DevTools (F12) Console for errors and confirm the extension is loaded.
