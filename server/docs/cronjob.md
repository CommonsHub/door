# Cron Job Setup

This document explains how to set up a cron job to automatically send door access emails to event attendees.

## What the Cron Job Does

The `npm run cron` command:

1. Fetches today's events from Luma that start within the next hour
2. Gets approved attendees for each event
3. Generates personalized door access URLs
4. Sends emails via Resend

## Prerequisites

Ensure these environment variables are set in your `.env` file:

```env
LUMA_API_KEY=your-luma-api-key
RESEND_API_KEY=your-resend-api-key
PRIVATE_KEY=your-private-key  # or let it auto-generate
```

## Testing

Before setting up the cron job, test with a dry run:

```bash
npm run test:cron
```

This shows what emails would be sent without actually sending them.

## Setting Up the Cron Job

### Option 1: System Crontab

Edit your crontab:

```bash
crontab -e
```

Add a line to run every 30 minutes:

```cron
*/30 * * * * cd /path/to/door/server && /usr/local/bin/npm run cron >> /var/log/door-cron.log 2>&1
```

Or every 15 minutes:

```cron
*/15 * * * * cd /path/to/door/server && /usr/local/bin/npm run cron >> /var/log/door-cron.log 2>&1
```

**Notes:**
- Replace `/path/to/door/server` with the actual path
- Use the full path to `npm` (find it with `which npm`)
- The log file captures output for debugging

### Option 2: Node.js with node-cron

If you prefer to run the cron inside the Node.js process, you can use the `node-cron` package.

### Option 3: Docker with Cron

If running in Docker, add to your Dockerfile:

```dockerfile
# Install cron
RUN apt-get update && apt-get install -y cron

# Add crontab file
COPY crontab /etc/cron.d/door-cron
RUN chmod 0644 /etc/cron.d/door-cron
RUN crontab /etc/cron.d/door-cron

# Start cron in the background
CMD cron && node index.js
```

Create a `crontab` file:

```cron
*/30 * * * * cd /app/server && npm run cron >> /var/log/cron.log 2>&1
```

### Option 4: Systemd Timer (Linux)

Create `/etc/systemd/system/door-email.service`:

```ini
[Unit]
Description=Door Access Email Sender

[Service]
Type=oneshot
WorkingDirectory=/path/to/door/server
ExecStart=/usr/local/bin/npm run cron
Environment=NODE_ENV=production
```

Create `/etc/systemd/system/door-email.timer`:

```ini
[Unit]
Description=Run door email sender every 30 minutes

[Timer]
OnCalendar=*:0/30
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable door-email.timer
sudo systemctl start door-email.timer
```

Check status:

```bash
systemctl list-timers | grep door
```

## Recommended Schedule

Since the script only sends emails for events starting within the next hour:

| Schedule | Cron Expression | Use Case |
|----------|-----------------|----------|
| Every 30 min | `*/30 * * * *` | Standard (recommended) |
| Every 15 min | `*/15 * * * *` | More timely notifications |
| Every hour | `0 * * * *` | Lower frequency |

Running every 30 minutes ensures attendees receive their door access link 30-60 minutes before the event starts.

## Monitoring

### Check Logs

```bash
# View recent log entries
tail -f /var/log/door-cron.log

# Check for errors
grep -i error /var/log/door-cron.log
```

### Verify Cron is Running

```bash
# List your crontab
crontab -l

# Check cron service status (Linux)
systemctl status cron

# Check recent cron executions (Linux)
grep CRON /var/log/syslog | tail -20
```

## Troubleshooting

### Emails Not Sending

1. **Check environment variables**: Run `npm run test:cron` to verify config
2. **Check Luma API**: Ensure `LUMA_API_KEY` is valid
3. **Check Resend API**: Ensure `RESEND_API_KEY` is valid
4. **Check event timing**: Only events starting within 1 hour are processed

### Cron Not Running

1. **Path issues**: Use full paths in crontab (`/usr/local/bin/npm`)
2. **Environment**: Cron runs with minimal environment; ensure `.env` is loaded
3. **Permissions**: Check the script has execute permissions
4. **Working directory**: Always `cd` to the correct directory first

### Duplicate Emails

The script doesn't track sent emails between runs. To prevent duplicates:
- Use a longer cron interval (e.g., 60 minutes)
- Or implement a sent-emails log (not currently built-in)

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run cron` | Send emails to attendees of events starting soon |
| `npm run test:cron` | Dry run - preview without sending |
| `npm run notify-attendees` | Interactive - select event and send |
| `npm run send-test-email` | Send a single test email |
