# Changelog

## [Unreleased] - 2025-12-02

### Added

#### Signature-Based Door Access
- New URL scheme for event organizers: `/open?name=$name&host=$host&reason=$reason&timestamp=$epoch&startTime=$epochStartTime&duration=$minutes&sig=$signature`
- Cryptographic signature verification using Ethereum message signing (EIP-191)
- Public key whitelist system (`authorized_keys.json`)
- Time-based access control with start time and duration
- Request freshness validation (5-minute window to prevent replay attacks)
- Tamper protection via signature verification

#### Append-Only Access Log
- New `door_access.log` file recording all door access
- JSON line-delimited format for easy parsing
- Records all access methods: discord, citizenwallet, token, signature, shortcut
- Includes timestamp, name, method, and method-specific metadata
- Tamper-evident audit trail

#### Testing & Tools
- Comprehensive test suite (`server/test/signature-auth.test.js`)
  - Tests valid access, future events, expired events, tampered signatures
  - Prints Discord message preview for each test
- Interactive URL generator (`scripts/generate-access-url.js`)
- Reusable utility library (`scripts/signature-utils.js`)
  - `generateSignedURL()` - Core signing function
  - `generateImmediateAccess()` - Quick access starting now
  - `generateScheduledAccess()` - Future event access
  - `generateTimeRangeAccess()` - Specify start and end times
- Example scripts (`examples/event-access-example.js`) with 6 real-world scenarios

#### Automated Event Email Sender
- Script to automatically send door access emails to Luma event attendees
- Integration with Luma API to fetch events and approved guests
- Integration with Resend API for email delivery
- Personalized door access URLs for each attendee
- Dry run mode for testing without sending emails
- Customizable markdown email template
- Cron job support for daily automation
- Comprehensive error handling and logging

#### Documentation
- `SIGNATURE_AUTH.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `QUICK_START.md` - Quick reference guide
- `LOG_FILE_FORMAT.md` - Log file format and usage
- `SECRET_BYPASS.md` - SECRET bypass feature guide
- `EVENT_EMAIL_SENDER.md` - Event email sender documentation
- `QUICK_START_EMAIL.md` - Quick start for email sender
- `CHANGELOG.md` - This file

### Changed

#### Discord Messages
- Signature-based access: `🚪 {name} opened the door for "{reason}" hosted by {host}`
- More consistent format across all access methods

#### Code Structure
- Added `verifyEventOrganizerSignature()` function in server/index.js:533-585
- Added `logDoorAccess()` function in server/index.js:61-77
- Updated GET `/open` endpoint to handle signature-based access first
- Added logging to all access methods (discord, citizenwallet, token, signature, shortcut)

### Security

#### New Security Features
- Cryptographic signatures prevent unauthorized access
- Time-based validation prevents early/late access
- Request freshness check prevents replay attacks
- Tamper protection via signature verification
- Public key whitelist for authorization control

#### Audit Trail
- All access logged to append-only file
- Includes who accessed, when, and how
- Supports compliance requirements (GDPR, SOC 2, ISO 27001)

### Backward Compatibility

✅ **Fully backward compatible** with existing authentication methods:
- Discord bot `open` command
- Citizen Wallet integration
- Token-based access (`/open?token=...`)
- User shortcuts (POST `/open`)

No breaking changes to existing functionality.

## Files Added

### Configuration
- `authorized_keys.json` - Public key whitelist

### Tests
- `server/test/signature-auth.test.js` - Test suite
- `server/test/README.md` - Testing guide

### Scripts
- `scripts/generate-access-url.js` - Interactive URL generator
- `scripts/signature-utils.js` - Utility library

### Examples
- `examples/event-access-example.js` - Usage examples

### Documentation
- `SIGNATURE_AUTH.md` - Feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `QUICK_START.md` - Quick reference
- `LOG_FILE_FORMAT.md` - Log format guide
- `CHANGELOG.md` - This changelog

### Logs
- `door_access.log` - Access log (created on first access, gitignored)

## Files Modified

### server/index.js
- Added import for `verifyMessage` from ethers
- Added import for `fs` module
- Added `authorizedKeys` configuration loading
- Added `LOG_FILE` constant and `logDoorAccess()` function
- Added `verifyEventOrganizerSignature()` function
- Updated GET `/open` endpoint to handle signature-based access
- Added logging to all access methods

### server/package.json
- Added `test` script: `node test/signature-auth.test.js`

## Dependencies

No new dependencies added. Uses existing:
- `ethers` - For signature verification
- `fs` - Built-in Node.js module for file operations

## Migration Guide

### For Administrators

1. **Review and update authorized_keys.json**
   - Replace example keys with real authorized organizers
   - Generate secure private keys for organizers
   - Store private keys securely (environment variables, key vault)

2. **Test the new functionality**
   ```bash
   cd server
   npm test
   ```

3. **Monitor the log file**
   ```bash
   tail -f door_access.log | jq
   ```

4. **Set up log rotation** (optional)
   - Configure logrotate for `door_access.log`
   - Set retention policy based on compliance requirements

### For Event Organizers

1. **Get your public key added**
   - Generate a wallet: `node -e "import('ethers').then(({Wallet}) => { const w = Wallet.createRandom(); console.log('Private Key:', w.privateKey); console.log('Public Address:', w.address); })"`
   - Share public address with administrator
   - Store private key securely

2. **Generate access URLs**
   ```bash
   node scripts/generate-access-url.js
   ```

3. **Share URLs with attendees**
   - Via email, SMS, QR code, or event platform

### For Developers

See `QUICK_START.md` for integration examples.

## Known Issues

None at this time.

## Future Enhancements

Potential improvements for future releases:

1. **Single-use signatures** - Add nonce to prevent URL reuse
2. **IP whitelisting** - Restrict to specific IP ranges
3. **Revocation list** - Ability to invalidate specific signatures
4. **Analytics dashboard** - Web UI for access analytics
5. **QR code generation** - Built-in QR code service
6. **URL shortening** - Integrate with URL shortener
7. **Multi-signature** - Require multiple organizers for approval
8. **Role-based access** - Different durations based on role
9. **Web UI for URL generation** - Browser-based generator
10. **Slack/Teams integration** - Post notifications to other platforms

## Support

For questions or issues:
1. Review documentation: `SIGNATURE_AUTH.md`, `QUICK_START.md`
2. Check test suite: `npm test`
3. View examples: `node examples/event-access-example.js`
4. Contact system administrator

## License

Same as parent project.
