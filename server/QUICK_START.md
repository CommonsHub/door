# Quick Start: Signature-Based Door Access

## For Event Organizers

### Step 1: Get Authorized

Contact the door administrator to add your public key to `authorized_keys.json`:

```bash
# Generate a new key pair
node -e "import('ethers').then(({Wallet}) => { const w = Wallet.createRandom(); console.log('Private Key:', w.privateKey); console.log('Public Address:', w.address); })"
```

**Important**: Save your private key securely. Share only the public address with the administrator.

### Step 2: Generate Access URL

Use the interactive tool:

```bash
node scripts/generate-access-url.js
```

Or use the utility library in your code:

```javascript
import { generateImmediateAccess } from './scripts/signature-utils.js';

const url = await generateImmediateAccess({
  attendeeName: "Guest Name",
  hostId: "YourOrgName",
  eventName: "Your Event",
  durationMinutes: 180
}, process.env.YOUR_PRIVATE_KEY);

console.log("Share this URL:", url);
```

### Step 3: Share with Attendees

Send the URL via:
- Email
- SMS
- QR code
- Event ticket

## For Developers

### Installation

No installation needed. Uses existing dependencies.

### Basic Usage

```javascript
import { generateSignedURL } from './scripts/signature-utils.js';

const now = Math.floor(Date.now() / 1000);

const url = await generateSignedURL({
  name: "Attendee Name",
  host: "Event Organizer ID",
  reason: "Event Name",
  startTime: now,
  duration: 180 // minutes
}, PRIVATE_KEY, "https://door.example.com");
```

### Advanced Examples

See `examples/event-access-example.js` for complete examples:

```bash
node examples/event-access-example.js
```

## For Administrators

### Add Authorized Organizer

Edit `authorized_keys.json`:

```json
[
  {
    "name": "Organization Name",
    "publicKey": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "description": "Primary event organizer"
  }
]
```

### Monitor Access

All access is logged to Discord:

```
🚪 Door opened by John Doe for event "Tech Meetup"
   (host: TechConf, authorized: Organization Name)
```

### Security Checklist

- [ ] Only add trusted organizations to authorized_keys.json
- [ ] Ensure organizers store private keys securely
- [ ] Review Discord logs regularly
- [ ] Rotate keys periodically
- [ ] Remove unauthorized keys immediately

## Testing

### Run Test Suite

```bash
npm test
# or
node test/signature-auth.test.js
```

**Note:** This is a Node.js project. Use `node` or `npm`, not `deno`.

### Test a URL

```bash
# Generate a test URL
node scripts/generate-access-url.js

# Test with curl
curl "http://localhost:3000/open?name=Test&host=Host&reason=Event&timestamp=TIME&startTime=TIME&duration=180&sig=SIG"
```

## URL Format

```
/open?name=$name&host=$host&reason=$reason&timestamp=$epoch&startTime=$epochStartTime&duration=$minutes&sig=$signature
```

### Parameters Explained

- **name**: Person requesting access (e.g., "John Doe")
- **host**: Organization ID (e.g., "TechConf2025")
- **reason**: Event name (e.g., "Web3 Meetup")
- **timestamp**: Current Unix time in seconds
- **startTime**: When access begins (Unix time in seconds)
- **duration**: How long access lasts (in minutes)
- **sig**: Ethereum signature proving authorization

## Common Use Cases

### Immediate Access (3 hours)

```bash
node scripts/generate-access-url.js
# Choose: Start time = now
# Duration = 180
```

### Future Event (tomorrow 9 AM - 5 PM)

```bash
node scripts/generate-access-url.js
# Choose: Start time = specific time
# Minutes from now = 900 (15 hours if it's 6 PM now)
# Duration = 480 (8 hours)
```

### All-Day Pass

```bash
node scripts/generate-access-url.js
# Duration = 1440 (24 hours)
```

### Multi-Day Event

```bash
node scripts/generate-access-url.js
# Duration = 4320 (72 hours for 3 days)
```

## Troubleshooting

### "Unauthorized public key"

Your address isn't in `authorized_keys.json`. Contact the administrator.

### "Event has not started yet"

The current time is before `startTime`. Wait until the event starts.

### "Event access period has expired"

The current time is after `startTime + duration`. Generate a new URL.

### "Request timestamp expired"

The URL is older than 5 minutes. Generate a fresh URL.

### "Invalid signature"

The URL was tampered with or incorrectly generated. Create a new one.

## Support & Documentation

- **Full Documentation**: See `SIGNATURE_AUTH.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Test Suite**: See `test/README.md`
- **Examples**: See `examples/event-access-example.js`

## Quick Reference

| Task | Command |
|------|---------|
| Generate URL | `node scripts/generate-access-url.js` |
| Run tests | `node test/signature-auth.test.js` |
| See examples | `node examples/event-access-example.js` |
| Check your address | `node -p "new (require('ethers').Wallet)(PRIVATE_KEY).address"` |

## Security Best Practices

1. **Never share private keys** - Only share public addresses
2. **Store keys in environment variables** - Not in code
3. **Use minimal time windows** - Grant only necessary duration
4. **Monitor access logs** - Review Discord messages regularly
5. **Rotate keys periodically** - Update authorized keys quarterly
6. **Revoke compromised keys** - Remove from authorized_keys.json immediately

## Examples

### Workshop (Immediate Access)

```javascript
import { generateImmediateAccess } from './scripts/signature-utils.js';

const url = await generateImmediateAccess({
  attendeeName: "Alice Smith",
  hostId: "TechEdu",
  eventName: "React Workshop",
  durationMinutes: 180
}, PRIVATE_KEY);
```

### Conference (Scheduled)

```javascript
import { generateScheduledAccess } from './scripts/signature-utils.js';

const eventDate = new Date('2025-03-15T09:00:00');

const url = await generateScheduledAccess({
  attendeeName: "Bob Jones",
  hostId: "DevConf",
  eventName: "Developer Conference",
  startTime: eventDate,
  durationMinutes: 480
}, PRIVATE_KEY);
```

### Batch Generation

```javascript
const attendees = ["Person 1", "Person 2", "Person 3"];

for (const name of attendees) {
  const url = await generateImmediateAccess({
    attendeeName: name,
    hostId: "MyOrg",
    eventName: "Team Event",
    durationMinutes: 240
  }, PRIVATE_KEY);

  console.log(`${name}: ${url}`);
}
```

## Need Help?

1. Check the documentation files listed above
2. Run the test suite to verify setup
3. Use the examples as templates
4. Contact the door administrator for access issues
