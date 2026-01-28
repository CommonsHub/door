#!/usr/bin/env node
/**
 * Send event access emails to approved Luma attendees
 *
 * This script fetches today's events from Luma (only those starting in the next hour),
 * generates door access URLs, and sends personalized emails to all approved attendees via Resend.
 *
 * Environment Variables:
 * - LUMA_API_KEY: Luma API key (required)
 * - RESEND_API_KEY: Resend API key (required unless DRY_RUN=true)
 * - PRIVATE_KEY: Private key for signing URLs (auto-generated if not provided)
 * - DATA_DIR: Directory to store generated private key (default: ./)
 * - DOOR_URL: Base URL for door access (default: https://door.commonshub.brussels)
 * - FROM_EMAIL: Email sender address (default: noreply@commonshub.brussels)
 * - TODAY: Override today's date for testing (format: YYYY-MM-DD)
 * - DRY_RUN: Set to 'true' to test without sending emails (default: false)
 * - ONLY_SEND_TO: Comma-separated list of whitelisted emails (optional, for testing)
 *
 * Usage:
 *   node scripts/send-event-access-emails.js
 *   DRY_RUN=true node scripts/send-event-access-emails.js
 *   TODAY=2025-12-03 node scripts/send-event-access-emails.js
 *   ONLY_SEND_TO=test@example.com,admin@example.com node scripts/send-event-access-emails.js
 */

import dotenv from "dotenv";
import { Wallet } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Set default timezone to Europe/Brussels if not specified
if (!process.env.TZ) {
  process.env.TZ = "Europe/Brussels";
}
const TIMEZONE = process.env.TZ;

// Configuration
const LUMA_API_KEY = process.env.LUMA_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DRY_RUN = process.env.DRY_RUN === "true";
const DOOR_URL = process.env.DOOR_URL || "https://door.commonshub.brussels";
const FROM_EMAIL = process.env.FROM_EMAIL || "hello@commonshub.brussels";
const TODAY = process.env.TODAY || new Date().toISOString().split("T")[0];
const DATA_DIR = process.env.DATA_DIR || "./";
const ONLY_SEND_TO = process.env.ONLY_SEND_TO ? process.env.ONLY_SEND_TO.split(",").map(e => e.trim().toLowerCase()) : null;

// Template path
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "event-access-email.md");

// Private key path
const PRIVATE_KEY_PATH = path.join(DATA_DIR, ".privateKey");

/**
 * Get or generate private key
 */
function getPrivateKey() {
  // Check environment variable first
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }

  // Check if key file exists
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    console.log("📂 Loading private key from file...");
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8").trim();
    return privateKey;
  }

  // Generate new private key
  console.log("🔑 No private key found, generating new one...");
  const wallet = Wallet.createRandom();
  const privateKey = wallet.privateKey;

  // Save to file
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  console.log(`✅ Private key saved to: ${PRIVATE_KEY_PATH}`);
  console.log(`🔐 Public address: ${wallet.address}`);
  console.log(`⚠️  Add this address to authorized_keys.json`);

  return privateKey;
}

const PRIVATE_KEY = getPrivateKey();

// Validate required environment variables
function validateConfig() {
  const missing = [];

  if (!LUMA_API_KEY) missing.push("LUMA_API_KEY");
  if (!DRY_RUN && !RESEND_API_KEY) missing.push("RESEND_API_KEY (or use DRY_RUN=true)");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
}

/**
 * Fetch events from Luma API for a specific date
 */
async function fetchLumaEvents(date) {
  console.log(`📅 Fetching events for ${date}...`);

  // Set up date range for the target date (00:00 to 23:59)
  const fromDate = date; // YYYY-MM-DD
  const toDate = date; // Same day

  // Construct URL with proper date range parameters
  const url = `https://public-api.luma.com/v1/calendar/list-events?before=${toDate}T23%3A59%3A59.999Z&after=${fromDate}T00%3A00%3A00.000Z&sort_column=start_at`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-luma-api-key": LUMA_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Luma API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Entries are already filtered by date range in the API call
    const allEvents = data.entries || [];

    // Filter events: only include those starting in the next hour
    const now = Date.now();
    const oneHourFromNow = now + (60 * 60 * 1000); // 1 hour in milliseconds

    const upcomingEvents = allEvents.filter(eventData => {
      const event = eventData.event;
      const startTime = new Date(event.start_at).getTime();
      const endTime = new Date(event.end_at).getTime();

      // Include events that:
      // 1. Start within the next hour AND
      // 2. Haven't finished yet
      return startTime <= oneHourFromNow && endTime > now;
    });

    const finishedCount = allEvents.filter(e => new Date(e.event.end_at).getTime() <= now).length;
    const tooFarCount = allEvents.filter(e => {
      const startTime = new Date(e.event.start_at).getTime();
      const endTime = new Date(e.event.end_at).getTime();
      return startTime > oneHourFromNow && endTime > now;
    }).length;

    console.log(`✅ Found ${upcomingEvents.length} event(s) starting in the next hour for ${date}`);
    if (finishedCount > 0) console.log(`   (${finishedCount} already finished)`);
    if (tooFarCount > 0) console.log(`   (${tooFarCount} starting later than 1 hour from now)`);

    return upcomingEvents;
  } catch (error) {
    console.error("❌ Error fetching Luma events:", error.message);
    throw error;
  }
}

/**
 * Fetch approved guests for an event
 */
async function fetchEventGuests(eventId) {
  console.log(`👥 Fetching guests for event ${eventId}...`);

  const url = `https://public-api.luma.com/v1/event/get-guests?event_api_id=${eventId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-luma-api-key": LUMA_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Luma API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // The response has entries array, each with a nested guest object
    let guests = [];

    if (data.entries && Array.isArray(data.entries)) {
      // Each entry has a nested guest object
      guests = data.entries.map(entry => entry.guest || entry);
    } else if (data.guests) {
      guests = data.guests;
    } else if (Array.isArray(data)) {
      guests = data;
    } else {
      console.log("⚠️  Unknown response structure. Keys:", Object.keys(data));
      console.log("   Full response:", JSON.stringify(data, null, 2));
    }

    // Filter approved guests
    const approvedGuests = guests.filter(guest => {
      if (!guest) return false;
      const status = guest.approval_status || guest.approvalStatus || guest.status;
      return status === "approved" || status === "APPROVED";
    });

    console.log(`✅ Found ${approvedGuests.length} approved guest(s) out of ${guests.length} total`);
    return approvedGuests;
  } catch (error) {
    console.error("❌ Error fetching event guests:", error.message);
    throw error;
  }
}

/**
 * Generate signed door access URL
 */
async function generateDoorAccessURL(params) {
  const { name, host, reason, startTime, duration, eventUrl } = params;

  const wallet = new Wallet(PRIVATE_KEY);
  const timestamp = Math.floor(Date.now() / 1000);

  const message = `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&eventUrl=${eventUrl}`;
  const signature = await wallet.signMessage(message);

  const url = `${DOOR_URL}/open?name=${encodeURIComponent(name)}&host=${encodeURIComponent(host)}&reason=${encodeURIComponent(reason)}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&eventUrl=${encodeURIComponent(eventUrl)}&sig=${encodeURIComponent(signature)}`;

  return url;
}

/**
 * Format event date and time
 */
function formatEventDateTime(event) {
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);

  const dateOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TIMEZONE
  };

  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE
  };

  const eventDate = startDate.toLocaleDateString('en-US', dateOptions);
  const startTimeStr = startDate.toLocaleTimeString('en-US', timeOptions);
  const endTimeStr = endDate.toLocaleTimeString('en-US', timeOptions);
  const eventTime = `${startTimeStr} - ${endTimeStr}`;

  return { eventDate, eventTime };
}

/**
 * Load and populate email template
 */
function generateEmailContent(template, variables) {
  let content = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  return content;
}

/**
 * Send email via Resend API
 */
async function sendEmail(to, subject, markdown) {
  if (DRY_RUN) {
    console.log(`   📧 [DRY RUN] Would send email to: ${to}`);
    console.log(`   Subject: ${subject}`);
    return { success: true, dryRun: true };
  }

  try {
    // Convert markdown to HTML with proper line breaks
    marked.setOptions({
      breaks: true,  // Convert \n to <br>
      gfm: true      // GitHub Flavored Markdown
    });
    const html = await marked(markdown);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        text: markdown,  // Plain text version for old email clients
        html: html       // HTML version converted from markdown
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(`   ✅ Email sent to ${to} (ID: ${data.id})`);
    return { success: true, data };
  } catch (error) {
    console.error(`   ❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process a single event
 */
async function processEvent(eventData, template) {
  const event = eventData.event;
  const eventId = event.api_id;
  const eventName = event.name;
  const hostName = event.host?.name || "Commons Hub";
  const eventUrl = event.url || `https://lu.ma/${eventId}`;

  console.log(`\n📋 Processing event: ${eventName}`);
  console.log(`   Host: ${hostName}`);
  console.log(`   URL: ${eventUrl}`);

  // Get event timing
  const { eventDate, eventTime } = formatEventDateTime(event);
  const startTime = Math.floor(new Date(event.start_at).getTime() / 1000);
  const endTime = Math.floor(new Date(event.end_at).getTime() / 1000);
  const duration = Math.ceil((endTime - startTime) / 60); // Convert to minutes

  console.log(`   Date: ${eventDate}`);
  console.log(`   Time: ${eventTime}`);
  console.log(`   Duration: ${duration} minutes`);

  // Fetch approved guests
  const guests = await fetchEventGuests(eventId);

  if (guests.length === 0) {
    console.log(`   ⚠️  No approved guests found, skipping...`);
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Process each guest
  for (const guest of guests) {
    const guestName = guest.name || "Guest";
    const guestEmail = guest.email;

    if (!guestEmail) {
      console.log(`   ⚠️  No email for ${guestName}, skipping...`);
      failed++;
      continue;
    }

    // Check whitelist if ONLY_SEND_TO is set
    if (ONLY_SEND_TO && !ONLY_SEND_TO.includes(guestEmail.toLowerCase())) {
      console.log(`   ⏭️  Skipping ${guestName} (${guestEmail}) - not in ONLY_SEND_TO whitelist`);
      continue;
    }

    console.log(`\n   👤 Processing ${guestName} (${guestEmail})`);

    try {
      // Generate door access URL
      const doorAccessUrl = await generateDoorAccessURL({
        name: guestName,
        host: hostName,
        reason: eventName,
        startTime,
        duration,
        eventUrl
      });

      console.log(`   🔑 Generated access URL`);

      // Generate email content
      const emailContent = generateEmailContent(template, {
        name: guestName,
        eventName,
        hostName,
        eventDate,
        eventTime,
        eventUrl,
        doorAccessUrl
      });

      // Send email
      const result = await sendEmail(
        guestEmail,
        `Door Access for ${eventName} at Commons Hub`,
        emailContent
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${guestName}:`, error.message);
      failed++;
    }
  }

  return { processed: guests.length, sent, failed };
}

/**
 * Main function
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  Event Access Email Sender                             ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log(`🕐 Timezone: ${TIMEZONE} | Local time: ${new Date().toLocaleString("en-GB", { timeZone: TIMEZONE })}\n`);

  if (DRY_RUN) {
    console.log("🧪 DRY RUN MODE - No emails will be sent\n");
  }

  // Validate configuration
  validateConfig();

  // Load email template
  console.log("📄 Loading email template...");
  let template;
  try {
    template = fs.readFileSync(TEMPLATE_PATH, "utf8");
    console.log("✅ Template loaded\n");
  } catch (error) {
    console.error("❌ Failed to load template:", error.message);
    process.exit(1);
  }

  // Fetch events
  let events;
  try {
    events = await fetchLumaEvents(TODAY);
  } catch (error) {
    console.error("❌ Failed to fetch events");
    process.exit(1);
  }

  if (events.length === 0) {
    console.log("ℹ️  No events found for today");
    process.exit(0);
  }

  // Process each event
  let totalProcessed = 0;
  let totalSent = 0;
  let totalFailed = 0;

  for (const event of events) {
    const result = await processEvent(event, template);
    totalProcessed += result.processed;
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Summary                                               ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  console.log(`Events processed:  ${events.length}`);
  console.log(`Guests processed:  ${totalProcessed}`);
  console.log(`Emails sent:       ${totalSent} ✅`);
  console.log(`Failed:            ${totalFailed} ❌`);

  if (DRY_RUN) {
    console.log("\n🧪 This was a dry run - no actual emails were sent");
  }

  console.log("\n✨ Done!");
}

// Run the script
main().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
