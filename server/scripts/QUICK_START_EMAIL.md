# Quick Start: Event Email Sender

Send door access emails to Luma event attendees in 5 minutes.

## Prerequisites

- Node.js installed
- Luma account with events
- Resend account for email
- Door server running with authorized keys

## Step 1: Get API Keys

### Luma API Key

1. Go to https://lu.ma/api
2. Click "Generate API Key"
3. Copy the key (starts with `luma_sk_`)

### Resend API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Copy the key (starts with `re_`)

## Step 2: Configure Environment

Edit `.env` file:

```bash
# Add to .env
LUMA_API_KEY=luma_sk_your_key_here
RESEND_API_KEY=re_your_key_here  # Optional for dry run
DOOR_URL=https://door.commonshub.brussels
FROM_EMAIL=noreply@commonshub.brussels
```

**Note:** `PRIVATE_KEY` is optional - it will be auto-generated on first run.
The public address will be logged and must be added to `authorized_keys.json`.

## Step 3: Verify Domain (Resend)

1. Go to https://resend.com/domains
2. Add your domain (e.g., `commonshub.brussels`)
3. Add DNS records as shown
4. Wait for verification (usually a few minutes)

## Step 4: Test with Dry Run

```bash
cd server
DRY_RUN=true node scripts/send-event-access-emails.js
```

You should see:
```
🧪 DRY RUN MODE - No emails will be sent
📅 Fetching events for 2025-12-03...
✅ Found X event(s)
...
📧 [DRY RUN] Would send email to: attendee@example.com
```

## Step 5: Test Specific Date

```bash
TODAY=2025-12-03 DRY_RUN=true node scripts/send-event-access-emails.js
```

## Step 6: Send Real Emails

Once testing looks good:

```bash
node scripts/send-event-access-emails.js
```

## Step 7: Set Up Cron Job

Run automatically every day at 8 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 8 * * * cd /path/to/door/server && node scripts/send-event-access-emails.js >> /var/log/event-emails.log 2>&1
```

## Troubleshooting

### "Missing required environment variables"

Make sure required variable is set:
- `LUMA_API_KEY`

For production (not dry run):
- `RESEND_API_KEY`

Optional (auto-generated if not provided):
- `PRIVATE_KEY`

### "No events found"

- Check events exist in Luma for today
- Try specific date: `TODAY=2025-12-03`
- Verify LUMA_API_KEY is correct

### "Resend API error"

- Check RESEND_API_KEY is correct
- Verify domain is verified in Resend
- Ensure FROM_EMAIL uses verified domain

### "Failed to send email"

- Check Resend dashboard for details
- Verify recipient email is valid
- Check API quota/limits

## Customizing

### Email Template

Edit `server/templates/event-access-email.md`:

```markdown
Hi {{name}},

Your custom message...

Event: {{eventName}}
Date: {{eventDate}}
Time: {{eventTime}}

Access: {{doorAccessUrl}}
```

### From Name

In Resend dashboard, configure your domain to show:
```
Commons Hub <noreply@commonshub.brussels>
```

## Monitoring

### View Logs

```bash
tail -f /var/log/event-emails.log
```

### Check Sent Emails

Resend dashboard: https://resend.com/emails

### Door Access Logs

```bash
cd /path/to/door
cat door_access.log | jq 'select(.method == "signature")'
```

## Next Steps

1. ✅ Test with dry run
2. ✅ Send test email to yourself
3. ✅ Verify door access URL works
4. ✅ Set up cron job
5. ✅ Monitor first production run

## Common Commands

```bash
# Dry run for today
DRY_RUN=true node scripts/send-event-access-emails.js

# Dry run for specific date
TODAY=2025-12-03 DRY_RUN=true node scripts/send-event-access-emails.js

# Send real emails
node scripts/send-event-access-emails.js

# Send for tomorrow
TODAY=$(date -d tomorrow +%Y-%m-%d) node scripts/send-event-access-emails.js
```

## Getting Help

1. Check full documentation: `EVENT_EMAIL_SENDER.md`
2. Review logs for errors
3. Test individual components:
   - Luma API: https://lu.ma/api-docs
   - Resend API: https://resend.com/docs
   - Door signature: `node test/signature-auth.test.js`

## Security Checklist

- [ ] ORGANIZER_PRIVATE_KEY is secure
- [ ] Private key is in authorized_keys.json
- [ ] .env file is not committed to git
- [ ] Email domain is verified
- [ ] Test URLs work before production
- [ ] Monitor logs for errors
- [ ] Set up alerts for failures

That's it! You're ready to send automated event access emails. 🎉
