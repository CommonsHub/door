# Environment Variables

This document describes all environment variables required to run the Commons Hub Door server.

## Required Variables

### `SECRET`

Secret key used for generating MD5 hash tokens for door access shortcuts.

- **Required**: Yes
- **Used in**: `index.js`, `routes/open/index.js`, token generation scripts
- **Example**: `my-super-secret-key-2024`

When combined with `DISCORD_GUILD_ID` and a user ID, this generates a unique token that allows members to open the door via `POST /open`.

---

### `DISCORD_BOT_TOKEN`

Authentication token for the Discord bot.

- **Required**: Yes
- **Used in**: `lib/discord.js`, `index.js`
- **Example**: `MTIzNDU2Nzg5MDEyMzQ1Njc4.GAbCdE.abcdefghijklmnopqrstuvwxyz123456`

Obtain this from the [Discord Developer Portal](https://discord.com/developers/applications) after creating a bot application.

---

### `DISCORD_CHANNEL_ID`

Discord channel ID where door access logs are posted.

- **Required**: Yes
- **Used in**: `lib/discord.js`, `index.js`
- **Example**: `1234567890123456789`

Right-click on a Discord channel and select "Copy Channel ID" (requires Developer Mode enabled in Discord settings).

---

### `DISCORD_GUILD_ID`

Discord server (guild) ID for member management and role assignments.

- **Required**: Yes (for full functionality)
- **Used in**: `index.js`, `routes/open/index.js`, token generation
- **Example**: `9876543210987654321`

Right-click on the server name in Discord and select "Copy Server ID".

---

## Optional Variables

### `PORT`

Express server listening port.

- **Required**: No
- **Default**: `3000`
- **Example**: `8080`

---

### `PRIVATE_KEY`

Ethereum private key for signing URLs and verifying event organizer access.

- **Required**: No (auto-generated if not provided)
- **Used in**: `index.js`, event access email scripts
- **Example**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

If not provided, a key is auto-generated and stored in `DATA_DIR/.privateKey`. This is used to sign URLs that grant temporary door access to event attendees.

---

### `DATA_DIR`

Directory to store generated files like the `.privateKey` file.

- **Required**: No
- **Default**: Current working directory
- **Example**: `/var/data/door`

---

### `LOG_DIR`

Directory for door access logs.

- **Required**: No
- **Default**: Current working directory
- **Example**: `/var/log/door`

The server writes to `door_access.log` in this directory.

---

### `DRY_RUN`

Boolean flag to test without sending emails or performing actual operations.

- **Required**: No
- **Default**: `false`
- **Example**: `true`

Set to `"true"` to run in test mode. Useful for debugging email scripts without actually sending emails.

---

### `DISCORD_FUNFACTS_CHANNEL_ID`

Discord channel ID for posting fun facts.

- **Required**: No
- **Used in**: `index.js`
- **Example**: `1234567890123456790`

---

### `DISCORD_PRESENT_TODAY_ROLE_ID`

Discord role ID assigned to members who are present at the space today.

- **Required**: No
- **Used in**: `index.js`
- **Example**: `1234567890123456791`

This role is automatically assigned when a member opens the door.

---

## Email & Event Integration Variables

These variables are required for the Luma event integration and email notifications.

### `LUMA_API_KEY`

API key for the Luma event platform.

- **Required**: Yes (for event email functionality)
- **Used in**: `scripts/send-event-access-emails.js`
- **Example**: `luma_sk_1234567890abcdef`

Obtain from your Luma account settings.

---

### `RESEND_API_KEY`

API key for the Resend email service.

- **Required**: Yes (for sending emails, unless `DRY_RUN=true`)
- **Used in**: `scripts/send-event-access-emails.js`
- **Example**: `re_1234567890abcdef`

Sign up at [resend.com](https://resend.com) and create an API key.

---

### `FROM_EMAIL`

Sender email address for event access emails.

- **Required**: No
- **Default**: `hello@commonshub.brussels`
- **Example**: `noreply@yourdomain.com`

Must be a verified sender domain in Resend.

---

### `DOOR_URL`

Base URL for door access links sent to event attendees.

- **Required**: No
- **Default**: `https://door.commonshub.brussels`
- **Example**: `https://door.yourdomain.com`

---

## Testing Variables

### `TODAY`

Override today's date for testing the email script.

- **Required**: No
- **Default**: Current date
- **Example**: `2024-03-15`

Format: `YYYY-MM-DD`. Useful for testing the event email script for a specific date.

---

### `ONLY_SEND_TO`

Comma-separated list of email addresses to whitelist for testing.

- **Required**: No
- **Default**: None (no filtering)
- **Example**: `test@example.com,dev@example.com`

When set, emails are only sent to addresses in this list, even if other attendees exist.

---

### `TZ`

Timezone used for formatting dates and times in emails and logs.

- **Required**: No
- **Default**: `Europe/Brussels`
- **Example**: `Europe/Paris`, `America/New_York`

All scripts display the active timezone at startup. Event times in emails are formatted using this timezone.

---

## Example `.env` File

```env
# Required
SECRET=your-secret-key-here
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=1234567890123456789
DISCORD_GUILD_ID=9876543210987654321

# Optional server config
PORT=3000
DATA_DIR=./data
LOG_DIR=./logs
TZ=Europe/Brussels

# Optional Discord features
DISCORD_FUNFACTS_CHANNEL_ID=1234567890123456790
DISCORD_PRESENT_TODAY_ROLE_ID=1234567890123456791

# Event email integration (optional)
LUMA_API_KEY=your-luma-api-key
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=hello@yourdomain.com
DOOR_URL=https://door.yourdomain.com

# Testing (optional)
DRY_RUN=false
# TODAY=2024-03-15
# ONLY_SEND_TO=test@example.com
```

## Security Notes

- Never commit your `.env` file to version control
- Keep `SECRET` and `PRIVATE_KEY` unique per deployment
- Store API keys securely and rotate them periodically
- The `PRIVATE_KEY` is auto-generated on first run if not provided, which is the recommended approach for new deployments
