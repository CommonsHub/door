#!/bin/bash
#
# Cron script to send event access emails
#
# Usage:
#   1. Make executable: chmod +x scripts/cron-send-emails.sh
#   2. Add to crontab: crontab -e
#   3. Add line: 0 8 * * * /path/to/door/server/scripts/cron-send-emails.sh
#
# This will run daily at 8:00 AM
#

# Set working directory (adjust path as needed)
cd "$(dirname "$0")/.." || exit 1

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set log file
LOG_FILE="${LOG_DIR:-.}/cron.log"

# Timestamp
echo "======================================" >> "$LOG_FILE"
echo "Starting email sender: $(date)" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"

# Run the script
node scripts/send-event-access-emails.js >> "$LOG_FILE" 2>&1

# Check exit status
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Email sender completed successfully" >> "$LOG_FILE"
else
    echo "❌ Email sender failed with exit code $EXIT_CODE" >> "$LOG_FILE"

    # Optional: Send alert email or Slack notification
    # curl -X POST https://slack.com/api/chat.postMessage \
    #   -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    #   -d "channel=#alerts" \
    #   -d "text=Event email sender failed with exit code $EXIT_CODE"
fi

echo "" >> "$LOG_FILE"
