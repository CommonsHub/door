# Door Access Log File Format

## Overview

All door access is recorded in an append-only log file: `door_access.log`

This file provides a permanent, tamper-evident audit trail of all door access attempts.

## File Location

```
door_access.log
```

Located in the root directory of the project (parent of server/).

## Format

Each line is a JSON object with the following structure:

```json
{
  "timestamp": "ISO 8601 timestamp",
  "name": "Person's name",
  "method": "Access method",
  ...additional metadata
}
```

## Access Methods

### 1. Discord (`method: "discord"`)

User opened door via Discord bot message.

```json
{
  "timestamp": "2025-12-02T15:30:45.123Z",
  "name": "John Smith",
  "method": "discord",
  "userId": "337769522100568076",
  "username": "johnsmith",
  "role": "members"
}
```

**Fields:**
- `userId` - Discord user ID
- `username` - Discord username
- `role` - Access role name from access_roles.json

### 2. Citizen Wallet (`method: "citizenwallet"`)

User opened door via Citizen Wallet app.

```json
{
  "timestamp": "2025-12-02T15:35:20.456Z",
  "name": "alice_crypto",
  "method": "citizenwallet",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": 150
}
```

**Fields:**
- `address` - Ethereum wallet address
- `balance` - Token balance at time of access

### 3. Token (`method: "token"`)

Door opened using daily token URL.

```json
{
  "timestamp": "2025-12-02T15:40:10.789Z",
  "name": "Token User",
  "method": "token",
  "date": "20251202"
}
```

**Fields:**
- `date` - Date in YYYYMMDD format

### 4. Signature (`method: "signature"`)

Event organizer opened door using signed URL.

```json
{
  "timestamp": "2025-12-02T16:00:30.123Z",
  "name": "Bob Johnson",
  "method": "signature",
  "host": "TechConf2025",
  "reason": "Blockchain Conference",
  "authorizedKey": "Tech Conference Organizer",
  "startTime": "1764688162",
  "duration": "480",
  "secretBypass": false
}
```

**Fields:**
- `host` - Event organizer identifier
- `reason` - Event name/reason for access
- `authorizedKey` - Name of authorized key from authorized_keys.json
- `startTime` - Unix timestamp when access starts
- `duration` - Duration in minutes
- `secretBypass` - Boolean indicating if SECRET was used to bypass time validation

### 5. Shortcut (`method: "shortcut"`)

User opened door via iOS/Android shortcut.

```json
{
  "timestamp": "2025-12-02T16:05:45.234Z",
  "name": "Carol Davis",
  "method": "shortcut",
  "userId": "123456789012345678",
  "username": "caroldavis"
}
```

**Fields:**
- `userId` - Discord user ID
- `username` - Discord username

## File Characteristics

### Append-Only

- New entries are always appended to the end
- Existing entries are never modified or deleted
- Maintains chronological order

### Line-Delimited JSON (NDJSON)

- Each line is a complete, valid JSON object
- Lines are separated by newline characters (`\n`)
- Easy to parse with standard tools

### Durability

- Written synchronously to disk on each access
- Survives server restarts
- Independent of in-memory state

## Usage Examples

### Read all entries

```bash
cat door_access.log
```

### Parse with jq

```bash
# Count access by method
cat door_access.log | jq -r '.method' | sort | uniq -c

# Find all signature-based access
cat door_access.log | jq 'select(.method == "signature")'

# Get access for specific person
cat door_access.log | jq 'select(.name == "John Smith")'

# Access in last hour
cat door_access.log | jq 'select(.timestamp > "'$(date -u -v-1H +%Y-%m-%dT%H:%M:%S)'")'
```

### Count by day

```bash
cat door_access.log | jq -r '.timestamp[0:10]' | sort | uniq -c
```

### Access by method

```bash
cat door_access.log | jq -r '.method' | sort | uniq -c
```

### Find event access

```bash
cat door_access.log | jq 'select(.method == "signature") | {name, reason, host, timestamp}'
```

### Export to CSV

```bash
cat door_access.log | jq -r '[.timestamp, .name, .method] | @csv' > access.csv
```

## Analytics Queries

### Daily Access Count

```bash
cat door_access.log | jq -r '.timestamp[0:10]' | sort | uniq -c | awk '{print $2, $1}'
```

### Busiest Hours

```bash
cat door_access.log | jq -r '.timestamp[11:13]' | sort | uniq -c | sort -rn | head -10
```

### Top Users

```bash
cat door_access.log | jq -r '.name' | sort | uniq -c | sort -rn | head -10
```

### Event Access Report

```bash
cat door_access.log | jq 'select(.method == "signature") | {
  date: .timestamp[0:10],
  name,
  event: .reason,
  organizer: .host
}'
```

### Find SECRET Bypass Usage

```bash
# Find all accesses that used SECRET bypass
cat door_access.log | jq 'select(.secretBypass == true)'

# Count how many times SECRET bypass was used
cat door_access.log | jq 'select(.secretBypass == true)' | wc -l
```

## Monitoring

### Real-time Tail

```bash
tail -f door_access.log | jq
```

### Alert on Access

```bash
tail -f door_access.log | while read line; do
  echo "🚪 Door accessed: $(echo $line | jq -r '.name') via $(echo $line | jq -r '.method')"
done
```

## Backup and Rotation

### Manual Backup

```bash
cp door_access.log "door_access_backup_$(date +%Y%m%d).log"
```

### Log Rotation (Recommended)

Create `/etc/logrotate.d/door_access`:

```
/path/to/door_access.log {
    daily
    rotate 365
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

## Security Considerations

1. **File Permissions**: Ensure only server process can write
   ```bash
   chmod 640 door_access.log
   chown server_user:server_group door_access.log
   ```

2. **Integrity**: Consider cryptographic signing for audit compliance

3. **Retention**: Define retention policy based on compliance requirements

4. **Backup**: Regular backups to secure, immutable storage

5. **Access Control**: Restrict read access to authorized personnel only

## Troubleshooting

### Log file not created

The file is created automatically on first door access. If it doesn't exist, check:
- Server process has write permissions to parent directory
- Disk space available
- Path in server/index.js is correct

### Failed to write to log file

Check console for error messages:
```
Failed to write to log file: <error>
```

Common causes:
- Insufficient disk space
- Permission denied
- Disk full
- File system read-only

### Analyzing large files

For large log files, use streaming tools:

```bash
# Count entries without loading entire file
grep -c '^{' door_access.log

# Find specific entries efficiently
grep '"method":"signature"' door_access.log | jq

# Get recent entries
tail -1000 door_access.log | jq
```

## Integration Examples

### Python

```python
import json

with open('door_access.log', 'r') as f:
    for line in f:
        entry = json.loads(line)
        print(f"{entry['timestamp']}: {entry['name']} via {entry['method']}")
```

### Node.js

```javascript
import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('door_access.log')
});

rl.on('line', (line) => {
  const entry = JSON.parse(line);
  console.log(`${entry.timestamp}: ${entry.name} via ${entry.method}`);
});
```

### Bash

```bash
#!/bin/bash
while IFS= read -r line; do
  name=$(echo "$line" | jq -r '.name')
  method=$(echo "$line" | jq -r '.method')
  timestamp=$(echo "$line" | jq -r '.timestamp')
  echo "$timestamp: $name via $method"
done < door_access.log
```

## Compliance

This log format supports:

- **GDPR**: Contains personal data (names, user IDs) - handle according to data protection regulations
- **SOC 2**: Provides audit trail for access control
- **ISO 27001**: Supports access logging requirements
- **HIPAA**: Can be used for access audit trails (if applicable)

Ensure log retention and disposal policies comply with applicable regulations.
