# Door Access Test Suite

This test suite covers both signature-based authentication and Discord role-based access control.

## Quick Start

1. **Run all tests:**
   ```bash
   npm test
   ```

2. **Run specific test suites:**
   ```bash
   npm run test:signature     # Signature authentication tests
   npm run test:discord       # Discord role-based access tests (examples)
   npm run test:integration   # Discord integration test (real data)
   ```

   **Note:** This is a Node.js project. Use `node` or `npm`, not `deno`.

3. **The test wallet address is:**
   ```
   0x14791697260E4c9A71f18484C9f997B308e59325
   ```
   This address is already added to `authorized_keys.json` for testing.

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Test a valid access URL:**
   The test suite will generate several URLs. Copy one of the valid URLs (Test 1 or Test 6) and test it:
   ```bash
   curl "http://localhost:3000/open?name=John%20Doe&host=eventOrganiser&reason=Web3%20Meetup&timestamp=TIMESTAMP&startTime=STARTTIME&duration=180&sig=SIGNATURE"
   ```

   Replace TIMESTAMP, STARTTIME, and SIGNATURE with values from the test output.

## Signature Authentication Test Cases

The signature test suite (`test/signature-auth.test.js`) includes these scenarios:

- ✅ **Test 1 - Valid Access**: Request within the time window
- ❌ **Test 2 - Future Event**: Event hasn't started yet (shows error page with countdown)
- ❌ **Test 3 - Expired Event**: Access window has passed
- ❌ **Test 4 - Tampered Signature**: Modified name parameter after signing
- ❌ **Test 5 - Tampered Event Time**: Modified startTime/duration parameters (security test)
- ✅ **Test 6 - Multiple Events**: Different events from different organizers

### Test 5: Security - Tampered Event Time

This critical security test verifies that attackers cannot bypass time restrictions by manually editing the URL:

1. Creates a signature for an expired event (ended 2 hours ago)
2. Attacker modifies the URL to change `startTime` to current time
3. Attacker modifies `duration` to extend the access window
4. **Expected result**: ❌ Access denied - signature validation fails

The signature cryptographically binds all parameters, making URL tampering impossible.

## Discord Role-Based Access Test Cases

The Discord test suite (`test/discord-access.test.js`) includes these scenarios:

- ✅ **Test 1 - Valid Role**: Member with role in `access_roles.json` during allowed hours
- ✅/❌ **Test 2 - Time-Based Access**: Member role with `timeRange: "8-20"` (8am-8pm only)
- ❌ **Test 3 - Invalid Role**: Member without any authorized roles
- ✅ **Test 4 - Building Manager**: Role with `timeRange: "anytime"` (24/7 access)
- ✅ **Test 5 - CitizenWallet**: Visitor with positive wallet balance

### Access Control Summary

The door can be opened by:
- ✓ Discord members with roles in `access_roles.json` (during allowed hours)
- ✓ CitizenWallet users with positive balance
- ✓ Event attendees with valid signature-based access codes
- ✓ Users with SECRET token (if configured)
- ✓ Building managers (24/7 access)

## Discord Integration Test

**NEW:** The integration test (`test/discord-integration.test.js`) connects to Discord and tests real users with time-based access control.

### What it tests:

**Test 1: Users with Anytime Access**
- Tests 4 users who should have 24/7 access:
  - @zak (1367797098321285173)
  - @leen (618897639836090398)
  - @doug (1371771286283354182)
  - @cedric (197741353772384256)
- Verifies they can access at any time of day, any day of week

**Test 2: Time-Restricted User**
- Tests @hurric (698307641973407805)
- Should only have access on **Tuesday evenings** (6pm-11pm)
- Tests 7 different scenarios:
  - ❌ Tuesday morning (should be denied)
  - ❌ Tuesday afternoon (should be denied)
  - ✅ Tuesday 6pm (should be granted)
  - ✅ Tuesday 8pm (should be granted)
  - ✅ Tuesday 10:30pm (should be granted)
  - ❌ Wednesday evening (should be denied - wrong day)
  - ❌ Monday evening (should be denied - wrong day)

**Test 3: Mock Function Verification**
- Verifies `addUser()` was called for granted access
- Verifies Discord messages were generated
- Confirms no actual Discord posts were made (all mocked)
- Confirms no role modifications were made (all mocked)

### How it works:

1. **Connects to Discord** and fetches real role data
2. **Loads members** from each role in `access_roles.json`
3. **Simulates different times** to test time-based access
4. **Mocks all modifications**:
   - `addUser()` is mocked (no role changes)
   - `sendDiscordMessage()` is mocked (no posts)
5. **Tracks mock calls** to verify functions were invoked

### Run the test:

```bash
npm run test:integration
```

### Requirements:

- `DISCORD_BOT_TOKEN` must be set
- `DISCORD_GUILD_ID` must be set
- Bot must have permission to read guild members
- The 5 test users must exist in the guild
- Roles must be configured in `access_roles.json`

### Expected output:

```
╔════════════════════════════════════════════════════════╗
║  Discord Integration Test - Time-based Access Control ║
╚════════════════════════════════════════════════════════╝

Test 1: Users with Anytime Access
@zak (1367797098321285173)
  Roles: Building Manager (anytime)
  Time: Tue, 09:00 (Tuesday)
  ✅ Access GRANTED
  >>> [MOCK] addUser called for: zak
  >>> [MOCK] Discord message (not sent): 🚪 zak opened the door

Test 2: Time-Restricted User (@hurric)
@hurric (698307641973407805)
  Roles: ImprovCollective (days: Tuesday, time: 18-23)

  Tuesday morning (should be DENIED)
  Time: Tue, 10:00 (Tuesday)
  ❌ Access DENIED
  ✓ PASS: Result matched expectation

  Tuesday 6pm (should be GRANTED)
  Time: Tue, 18:00 (Tuesday)
  ✅ Access GRANTED
  ✓ PASS: Result matched expectation

Test 3: Mock Function Verification
addUser called: 8 times
  ✓ PASS: addUser was called
Discord messages (mocked): 8 messages
  ✓ PASS: Discord messages were generated

✨ All tests passed! ✨
```

### Important notes:

- This test uses **REAL Discord data** but **mocks all modifications**
- No messages are posted to Discord
- No roles are added or removed
- The test simulates time internally - it doesn't change server time
- Safe to run in production environment (read-only operations)

## Generate Custom URLs

Use the interactive generator:

```bash
node scripts/generate-access-url.js
```

Follow the prompts to create a custom signed URL.

## Expected Behavior

### Successful Access (200 OK)
- Opens the door for 3.5 seconds
- Displays welcome HTML page
- Logs access to Discord with event details

### Denied Access (403 Forbidden)
Returns an error message explaining why:
- "Missing required parameters"
- "Request timestamp expired (must be within 5 minutes)"
- "Event has not started yet"
- "Event access period has expired"
- "Unauthorized public key"
- "Invalid signature"

## Production Setup

1. **Generate a secure private key:**
   ```javascript
   import { Wallet } from "ethers";
   const wallet = Wallet.createRandom();
   console.log("Private Key:", wallet.privateKey);
   console.log("Address:", wallet.address);
   ```

2. **Add the address to authorized_keys.json:**
   ```json
   {
     "name": "Your Organization Name",
     "publicKey": "0xYourAddressHere",
     "description": "Description of organization"
   }
   ```

3. **Store the private key securely:**
   - Use environment variables
   - Never commit to version control
   - Use a password manager or secrets vault

4. **Generate URLs programmatically or via CLI**

## Manual Testing

### Test Error Pages
```bash
# Test "event not started yet" error
curl "http://localhost:3000/error?reason=early"

# Test "event has finished" error
curl "http://localhost:3000/error?reason=late"

# Test "invalid signature" error
curl "http://localhost:3000/error?reason=invalid"
```

### Test Success Page
```bash
curl "http://localhost:3000/success"
```

### Test Discord OAuth Flow
1. Visit `http://localhost:3000/`
2. Click "Sign in with Discord"
3. Authorize the application
4. Try to open the door
5. Check that access is granted/denied based on your roles in `access_roles.json`

### Verify Logs
All door access attempts are logged to `door_access.log`:
```bash
tail -f door_access.log
```

Log format (JSON):
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "name": "John Doe",
  "method": "signature|discord|citizenwallet|token|shortcut",
  "metadata": {
    "eventName": "Web3 Meetup",
    "eventUrl": "https://lu.ma/web3-meetup",
    "host": "eventOrganiser"
  }
}
```

## Security Notes

- The test private key (`0x0123...`) is for development only
- Request timestamps must be within 5 minutes (prevents replay attacks)
- Access is only valid within the specified time window
- Tampering with any parameter invalidates the signature (Test 5 verifies this)
- Only whitelisted addresses in `authorized_keys.json` can generate valid signatures
- Time-based restrictions cannot be bypassed by URL manipulation
