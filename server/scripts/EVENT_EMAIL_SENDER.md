# Event Access Email Sender

Automated script to send door access emails to approved Luma event attendees.

## Overview

This script:
1. Fetches today's events from Luma API
2. Gets all approved attendees for each event
3. Generates personalized door access URLs with cryptographic signatures
4. Sends customized emails via Resend API

## Requirements

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LUMA_API_KEY` | Yes | Luma API key | `luma_sk_...` |
| `RESEND_API_KEY` | No* | Resend API key (*required unless DRY_RUN=true) | `re_...` |
| `PRIVATE_KEY` | No | Ethereum private key (auto-generated if not provided) | `0x...` |
| `DATA_DIR` | No | Directory for auto-generated key | `./` |
| `DOOR_URL` | No | Door base URL | `https://door.commonshub.brussels` |
| `FROM_EMAIL` | No | Sender email address | `noreply@commonshub.brussels` |
| `TODAY` | No | Override date (testing) | `2025-12-03` |
| `DRY_RUN` | No | Test without sending | `true` |

### Dependencies

Already included in project:
- `ethers` - For signature generation
- `fs` - File system operations
- `fetch` - HTTP requests (Node.js built-in)

## Setup

### 1. Get Luma API Key

1. Go to https://lu.ma/api
2. Generate an API key
3. Add to `.env`:
   ```bash
   LUMA_API_KEY=luma_sk_your_key_here
   ```

### 2. Get Resend API Key

1. Go to https://resend.com/api-keys
2. Create an API key
3. Add to `.env`:
   ```bash
   RESEND_API_KEY=re_your_key_here
   ```

### 3. Configure Email Domain

In Resend dashboard:
1. Add and verify your domain (e.g., `commonshub.brussels`)
2. Update `.env`:
   ```bash
   FROM_EMAIL=events@commonshub.brussels
   ```

### 4. Private Key (Optional - Auto-Generated)

The script will automatically generate a private key if none exists:
- First run generates key and saves to `.privateKey`
- Public address is logged on startup
- You must add the address to `authorized_keys.json`

**Or provide your own:**
```bash
PRIVATE_KEY=0xyour_private_key_here
```

**Or use server's auto-generated key:**
The door server automatically creates a key on first startup that you can reuse.

## Usage

### Basic Usage

```bash
cd server
node scripts/send-event-access-emails.js
```

### Dry Run (Testing)

Test without sending emails:

```bash
DRY_RUN=true node scripts/send-event-access-emails.js
```

### Test Specific Date

```bash
TODAY=2025-12-03 DRY_RUN=true node scripts/send-event-access-emails.js
```

### Cron Job

Add to crontab to run daily at 8 AM:

```cron
0 8 * * * cd /path/to/door/server && node scripts/send-event-access-emails.js >> /var/log/event-emails.log 2>&1
```

Or use a more sophisticated schedule:

```cron
# Run at 8 AM every day
0 8 * * * cd /path/to/door/server && node scripts/send-event-access-emails.js

# Run at 8 AM and 2 PM every day
0 8,14 * * * cd /path/to/door/server && node scripts/send-event-access-emails.js
```

## Email Template

The email template is located at:
```
server/templates/event-access-email.md
```

### Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | Attendee name | "John Doe" |
| `{{eventName}}` | Event name | "Crypto Wednesday" |
| `{{hostName}}` | Event host | "Commons Hub" |
| `{{eventDate}}` | Formatted date | "Wednesday, December 3, 2025" |
| `{{eventTime}}` | Time range | "10:00 AM - 10:00 PM" |
| `{{doorAccessUrl}}` | Signed door URL | "https://door.commonshub.brussels/open?..." |

### Customizing Template

Edit `server/templates/event-access-email.md`:

```markdown
Hi {{name}},

Your custom message here...

Event: {{eventName}}
Date: {{eventDate}}

Access link: {{doorAccessUrl}}

Best regards,
Your Team
```

## Output Examples

### Successful Run

```
╔════════════════════════════════════════════════════════╗
║  Event Access Email Sender                             ║
╚════════════════════════════════════════════════════════╝

📄 Loading email template...
✅ Template loaded

📅 Fetching events for 2025-12-03...
✅ Found 2 event(s) for 2025-12-03

📋 Processing event: Crypto Wednesday
   Host: Commons Hub
   Date: Wednesday, December 3, 2025
   Time: 10:00 AM - 10:00 PM
   Duration: 720 minutes

👥 Fetching guests for event evt_abc123...
✅ Found 5 approved guest(s)

   👤 Processing John Doe (john@example.com)
   🔑 Generated access URL
   ✅ Email sent to john@example.com (ID: email_123)

   👤 Processing Jane Smith (jane@example.com)
   🔑 Generated access URL
   ✅ Email sent to jane@example.com (ID: email_124)

╔════════════════════════════════════════════════════════╗
║  Summary                                               ║
╚════════════════════════════════════════════════════════╝

Events processed:  2
Guests processed:  10
Emails sent:       10 ✅
Failed:            0 ❌

✨ Done!
```

### Dry Run

```
🧪 DRY RUN MODE - No emails will be sent

📄 Loading email template...
✅ Template loaded

📅 Fetching events for 2025-12-03...
✅ Found 1 event(s) for 2025-12-03

📋 Processing event: Tech Meetup
   ...
   👤 Processing John Doe (john@example.com)
   🔑 Generated access URL
   📧 [DRY RUN] Would send email to: john@example.com
   Subject: Door Access for Tech Meetup at Commons Hub

╔════════════════════════════════════════════════════════╗
║  Summary                                               ║
╚════════════════════════════════════════════════════════╝

Events processed:  1
Guests processed:  3
Emails sent:       3 ✅
Failed:            0 ❌

🧪 This was a dry run - no actual emails were sent

✨ Done!
```

## Luma API Integration

### Events Endpoint

```
GET https://public-api.luma.com/v1/calendar/list-events?before={date}T23:59:59.999Z&after={date}T00:00:00.000Z&sort_column=start_at
```

Returns events within the specified date range.

**Parameters:**
- `before` - End of date range (ISO 8601 format, URL encoded)
- `after` - Start of date range (ISO 8601 format, URL encoded)
- `sort_column` - Sort by start time

**Headers:**
- `x-luma-api-key` - Your Luma API key

### Guests Endpoint

```
GET https://public-api.luma.com/v1/event/get-guests?event_api_id={event_id}
```

Returns all guests for a specific event.

**Parameters:**
- `event_api_id` - The event's API ID

**Headers:**
- `x-luma-api-key` - Your Luma API key

### Guest Approval Status

The script only processes guests with:
```javascript
guest.approval_status === "approved"
```

Other statuses (pending, declined) are skipped.

## Resend API Integration

### Send Email Endpoint

```
POST https://api.resend.com/emails
```

**Request:**
```json
{
  "from": "noreply@commonshub.brussels",
  "to": ["attendee@example.com"],
  "subject": "Door Access for Event",
  "text": "Email content in markdown"
}
```

**Response:**
```json
{
  "id": "email_abc123",
  "from": "noreply@commonshub.brussels",
  "to": "attendee@example.com",
  "created_at": "2025-12-03T08:00:00Z"
}
```

## Door Access URL Generation

Each attendee gets a unique signed URL:

```
https://door.commonshub.brussels/open?
  name=John%20Doe&
  host=Commons%20Hub&
  reason=Crypto%20Wednesday&
  timestamp=1764689567&
  startTime=1764752400&
  duration=720&
  sig=01bdada3e201d16b3a3762e13390a59fd59a84645afdeb1119f6ba361944db9e
```

**Parameters:**
- `name` - Attendee name from Luma
- `host` - Event host from Luma
- `reason` - Event name
- `timestamp` - Current Unix time
- `startTime` - Event start time (Unix)
- `duration` - Event duration in minutes
- `sig` - Ethereum signature

## Security

### Private Key Protection

The organizer private key must match an entry in `authorized_keys.json`:

```json
{
  "name": "Event Organizer",
  "publicKey": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "description": "Automated event emails"
}
```

### Signature Verification

Each URL is cryptographically signed. The door server:
1. Verifies the signature
2. Checks the public key is authorized
3. Validates the time window
4. Logs all access attempts

## Troubleshooting

### No events found

**Issue:** Script finds 0 events for today

**Solutions:**
1. Check events exist in Luma for today
2. Verify LUMA_API_KEY is correct
3. Test with specific date: `TODAY=2025-12-03`
4. Check Luma API status

### Email sending fails

**Issue:** Resend API returns error

**Solutions:**
1. Verify RESEND_API_KEY is correct
2. Check domain is verified in Resend
3. Ensure FROM_EMAIL uses verified domain
4. Check Resend API quota

### Signature verification fails

**Issue:** Door doesn't open with generated URL

**Solutions:**
1. Verify ORGANIZER_PRIVATE_KEY is correct
2. Check public key is in `authorized_keys.json`
3. Test URL with SECRET bypass for debugging
4. Check server logs

### No approved guests

**Issue:** Event has guests but script finds none

**Solutions:**
1. Check guest approval status in Luma
2. Approve pending guests
3. Verify guest has email address

## Monitoring

### Check Last Run

```bash
tail -100 /var/log/event-emails.log
```

### Count Emails Sent

```bash
grep "Email sent" /var/log/event-emails.log | wc -l
```

### Find Failures

```bash
grep "Failed" /var/log/event-emails.log
```

### Monitor Cron Job

```bash
# Check cron is running
systemctl status cron

# View cron logs
grep CRON /var/log/syslog | tail -20
```

## Testing Checklist

Before running in production:

- [ ] Test with `DRY_RUN=true`
- [ ] Verify email template renders correctly
- [ ] Test door access URL works
- [ ] Check emails arrive in inbox (not spam)
- [ ] Verify signature is from authorized key
- [ ] Test with future date using `TODAY`
- [ ] Check error handling (invalid API key, no events, etc.)
- [ ] Monitor first production run closely

## Advanced Configuration

### Custom Event Filtering

Edit script to filter specific events:

```javascript
const todayEvents = data.entries?.filter(event => {
  const eventDate = new Date(event.event.start_at).toISOString().split("T")[0];
  const isToday = eventDate === date;
  const isCommonsHub = event.event.name.includes("Commons Hub");
  return isToday && isCommonsHub;
}) || [];
```

### Multiple Organizers

Use different private keys for different event types:

```javascript
const ORGANIZER_KEYS = {
  "Commons Hub": process.env.COMMONSHUB_PRIVATE_KEY,
  "Tech Events": process.env.TECH_PRIVATE_KEY,
};

const privateKey = ORGANIZER_KEYS[event.host.name] || ORGANIZER_PRIVATE_KEY;
```

### Rate Limiting

Add delays between emails:

```javascript
// Add delay function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// In processEvent loop:
await sendEmail(...);
await sleep(1000); // Wait 1 second between emails
```

## Integration with Other Systems

### Slack Notifications

Add Slack webhook to notify when emails sent:

```javascript
async function notifySlack(summary) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({
      text: `📧 Sent ${summary.sent} event access emails`
    })
  });
}
```

### Database Logging

Log to database for analytics:

```javascript
async function logToDatabase(guest, event, emailId) {
  // Insert into your database
  await db.insert("event_emails", {
    guest_email: guest.email,
    event_id: event.id,
    email_id: emailId,
    sent_at: new Date()
  });
}
```

## FAQ

**Q: Can I send emails for tomorrow's events?**

A: Yes, set `TODAY` to tomorrow's date:
```bash
TODAY=$(date -d tomorrow +%Y-%m-%d) node scripts/send-event-access-emails.js
```

**Q: What if an attendee doesn't receive the email?**

A: Check Resend dashboard for delivery status. Generate a new URL manually if needed.

**Q: Can I resend emails?**

A: Yes, run the script again. Each run generates new URLs (different timestamps).

**Q: Do URLs expire?**

A: Yes, based on event duration. URLs stop working after `startTime + duration`.

**Q: Can I customize emails per event?**

A: Yes, modify the template or create multiple templates and select based on event type.

## Support

For issues:
1. Check logs: `/var/log/event-emails.log`
2. Test with dry run mode
3. Verify environment variables
4. Check API service status (Luma, Resend)
5. Review door access logs: `door_access.log`
