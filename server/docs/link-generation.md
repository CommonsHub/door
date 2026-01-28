# Event Access Link Generation

This document explains how to generate door access links for events with time-limited access windows.

## Overview

Event organizers can generate signed URLs that grant attendees temporary door access during a specific time window. The system uses Ethereum-based cryptographic signatures to verify that links were created by authorized organizers.

## Link Format

```
https://door.commonshub.brussels/open?name=John%20Doe&host=Commons%20Hub&reason=Event%20Name&timestamp=1764689567&startTime=1764752400&duration=720&eventUrl=https%3A%2F%2Flu.ma%2Fevent&sig=0x...
```

### Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `name` | Yes | Attendee name | `John Doe` |
| `host` | Yes | Event organizer identifier | `Commons Hub` |
| `reason` | Yes | Event name or access reason | `Crypto Wednesday` |
| `timestamp` | Yes | When the URL was generated (Unix seconds) | `1764689567` |
| `startTime` | Yes | Event start time (Unix seconds) | `1764752400` |
| `duration` | Yes | Event duration in minutes | `720` |
| `eventUrl` | No | Link to event details | `https://lu.ma/event123` |
| `sig` | Yes | Ethereum signature for verification | `0x01bdada3...` |

## Time Window

Access is granted within a grace window around the event:

```
[startTime - 15 min] ←── ACCESS GRANTED ──→ [startTime + duration + 15 min]
```

- **15 minutes early**: Attendees can arrive before the event starts
- **15 minutes after**: Accommodates events running late

## Generating Links

### Method 1: Interactive CLI Tool

The easiest way to generate a link:

```bash
node scripts/generate-access-url.js
```

This prompts you for:
- Attendee name
- Host/organizer name
- Event name (reason)
- Start time (flexible input: "now", "tomorrow 9am", Unix timestamp, etc.)
- Duration in minutes

### Method 2: Using the Signature Utilities Library

Import the utilities in your own scripts:

```javascript
const {
  generateSignedURL,
  generateImmediateAccess,
  generateScheduledAccess,
  generateTimeRangeAccess
} = require('./scripts/signature-utils');

const privateKey = process.env.PRIVATE_KEY;
const baseUrl = 'https://door.commonshub.brussels';
```

#### Immediate Access (starts now)

```javascript
const url = await generateImmediateAccess({
  attendeeName: 'Alice Johnson',
  hostId: 'TechEducation',
  eventName: 'React Workshop',
  durationMinutes: 180  // 3 hours
}, privateKey, baseUrl);
```

#### Scheduled Access (future event)

```javascript
const url = await generateScheduledAccess({
  attendeeName: 'Bob Smith',
  hostId: 'DevConf2025',
  eventName: 'Developer Conference',
  startTime: new Date('2025-12-10T09:00:00'),
  durationMinutes: 480  // 8 hours
}, privateKey, baseUrl);
```

#### Time Range Access (start and end times)

```javascript
const url = await generateTimeRangeAccess({
  attendeeName: 'Carol Williams',
  hostId: 'StartupWeek',
  eventName: 'Startup Week Brussels',
  startTime: new Date('2025-12-10T08:00:00'),
  endTime: new Date('2025-12-12T20:00:00')
}, privateKey, baseUrl);
```

#### Generic Signed URL

```javascript
const url = await generateSignedURL({
  name: 'John Doe',
  host: 'TechCorp',
  reason: 'Conference 2025',
  startTime: 1764752400,  // Unix seconds
  duration: 480,          // minutes
  eventUrl: 'https://lu.ma/event123'  // optional
}, privateKey, baseUrl);
```

### Method 3: Automated Emails via Luma Integration

For events managed through Luma, use the automated email script:

```bash
# Test mode (no emails sent)
DRY_RUN=true node scripts/send-event-access-emails.js

# Send emails for today's events
node scripts/send-event-access-emails.js

# Send emails for a specific date
TODAY=2025-12-03 node scripts/send-event-access-emails.js

# Only send to specific addresses (testing)
ONLY_SEND_TO=test@example.com node scripts/send-event-access-emails.js
```

This script:
1. Fetches today's events from Luma
2. Gets approved attendees for each event
3. Generates personalized door access URLs
4. Sends emails via Resend

## Getting Whitelisted as an Event Organizer

To generate valid door access links, your Ethereum public key must be added to the authorized keys list.

### Step 1: Generate a Key Pair

If you don't have an Ethereum key pair:

```javascript
const { createTestWallet } = require('./scripts/signature-utils');

const { privateKey, address } = createTestWallet();
console.log('Private Key:', privateKey);  // Keep this secret!
console.log('Public Address:', address);  // Share this for whitelisting
```

Or use any Ethereum wallet (MetaMask, etc.) to get your public address.

### Step 2: Request Whitelisting

Contact the Commons Hub administrator with:
- Your name/organization
- Your Ethereum public address (starts with `0x`)
- Description of your use case

### Step 3: Administrator Adds Your Key

The administrator adds your key to `authorized_keys.json`:

```json
[
  {
    "name": "Your Organization",
    "publicKey": "0xYourPublicAddressHere",
    "description": "Event organizer for weekly meetups"
  }
]
```

### Server Auto-Authorization

The door server automatically generates its own key pair on first startup and adds it to `authorized_keys.json`. This allows the server to run the Luma email integration without manual key registration.

## How Signatures Work

1. **Message Construction**: Parameters are concatenated in a specific order:
   ```
   name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}
   ```

2. **Signing**: The message is signed using Ethereum's `signMessage()`:
   ```javascript
   const wallet = new Wallet(privateKey);
   const signature = await wallet.signMessage(message);
   ```

3. **Verification**: The server recovers the public key from the signature and checks if it's in the whitelist.

## Examples

Run the example script to see various scenarios:

```bash
node examples/event-access-example.js
```

This demonstrates:
1. Workshop starting now (3 hours)
2. Conference tomorrow (8 hours)
3. Multi-day event (72 hours)
4. Evening event with early arrival buffer
5. VIP all-day access (24 hours)
6. Batch generation for multiple attendees

## Security Notes

- **URLs are bearer tokens**: Anyone with the URL can access the door during the time window
- **Time-limited**: Access automatically expires based on the time window
- **Non-transferable intent**: Each URL contains the attendee's name, logged on access
- **Audit trail**: All access attempts are logged to `door_access.log` and Discord
- **No revocation**: Once generated, links cannot be revoked (they simply expire)

### Best Practices

- Generate links close to the event time when possible
- Use specific durations rather than overly long windows
- Keep your private key secure (never commit to version control)
- Use `DRY_RUN=true` when testing email scripts

## Troubleshooting

### "Event has not started yet"

The current time is more than 15 minutes before `startTime`. Wait until closer to the event.

### "Event access period has expired"

The current time is more than 15 minutes after `startTime + duration`. The access window has closed.

### "Unauthorized public key"

Your public key is not in `authorized_keys.json`. Contact an administrator to get whitelisted.

### "Invalid signature"

The signature doesn't match the message parameters. This could indicate:
- Parameters were modified after signing
- Wrong private key was used
- Message format mismatch

## Environment Variables

For link generation scripts:

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Your Ethereum private key for signing |
| `DOOR_URL` | Base URL (default: `https://door.commonshub.brussels`) |
| `LUMA_API_KEY` | Required for Luma integration |
| `RESEND_API_KEY` | Required for sending emails |

See [env-variables.md](./env-variables.md) for the complete list.
