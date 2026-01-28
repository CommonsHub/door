#!/usr/bin/env node
/**
 * Interactive script to notify event attendees with door access links
 *
 * Lists upcoming events, lets you select one, and sends door access emails
 * to approved attendees.
 *
 * Usage: npm run notify-attendees
 */

import dotenv from "dotenv";
import { Wallet } from "ethers";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(serverDir, ".env") });

// Set default timezone to Europe/Brussels if not specified
if (!process.env.TZ) {
  process.env.TZ = "Europe/Brussels";
}
const TIMEZONE = process.env.TZ;

// Configuration
const LUMA_API_KEY = process.env.LUMA_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DOOR_URL = process.env.DOOR_URL || "https://door.commonshub.brussels";
const FROM_EMAIL = process.env.FROM_EMAIL || "hello@commonshub.brussels";
const ONLY_SEND_TO = process.env.ONLY_SEND_TO
  ? process.env.ONLY_SEND_TO.split(",").map((e) => e.trim().toLowerCase())
  : null;

const TEMPLATE_PATH = path.join(serverDir, "templates", "event-access-email.md");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query, defaultValue = "") {
  const prompt = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
  return new Promise((resolve) =>
    rl.question(prompt, (answer) => resolve(answer.trim() || defaultValue))
  );
}

function getPrivateKey() {
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }

  const keyPath = path.join(serverDir, ".privateKey");
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf8").trim();
  }

  return null;
}

/**
 * Fetch upcoming events from Luma API
 */
async function fetchUpcomingEvents(limit = 5) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

  const fromDate = now.toISOString().split("T")[0];
  const toDate = futureDate.toISOString().split("T")[0];

  const url = `https://public-api.luma.com/v1/calendar/list-events?after=${fromDate}T00%3A00%3A00.000Z&before=${toDate}T23%3A59%3A59.999Z&sort_column=start_at`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-luma-api-key": LUMA_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Luma API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const allEvents = data.entries || [];

  // Filter to only future events (not already ended)
  const nowTime = Date.now();
  const upcomingEvents = allEvents
    .filter((e) => new Date(e.event.end_at).getTime() > nowTime)
    .slice(0, limit);

  return upcomingEvents;
}

/**
 * Fetch approved guests for an event
 */
async function fetchEventGuests(eventId) {
  const url = `https://public-api.luma.com/v1/event/get-guests?event_api_id=${eventId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-luma-api-key": LUMA_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Luma API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let guests = [];

  if (data.entries && Array.isArray(data.entries)) {
    guests = data.entries.map((entry) => entry.guest || entry);
  } else if (data.guests) {
    guests = data.guests;
  } else if (Array.isArray(data)) {
    guests = data;
  }

  const approvedGuests = guests.filter((guest) => {
    if (!guest) return false;
    const status = guest.approval_status || guest.approvalStatus || guest.status;
    return status === "approved" || status === "APPROVED";
  });

  return { approved: approvedGuests, total: guests.length };
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}

/**
 * Generate signed door access URL
 */
async function generateDoorAccessURL(params, privateKey) {
  const { name, host, reason, startTime, duration, eventUrl } = params;

  const wallet = new Wallet(privateKey);
  const timestamp = Math.floor(Date.now() / 1000);

  const message = `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&eventUrl=${eventUrl}`;
  const signature = await wallet.signMessage(message);

  return `${DOOR_URL}/open?name=${encodeURIComponent(name)}&host=${encodeURIComponent(host)}&reason=${encodeURIComponent(reason)}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&eventUrl=${encodeURIComponent(eventUrl)}&sig=${encodeURIComponent(signature)}`;
}

/**
 * Send email via Resend API
 */
async function sendEmail(to, subject, markdown) {
  marked.setOptions({ breaks: true, gfm: true });
  const html = await marked(markdown);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text: markdown,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Notify Event Attendees                                ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log(`Timezone: ${TIMEZONE}\n`);

  // Validate config
  if (!LUMA_API_KEY) {
    console.error("LUMA_API_KEY is required");
    rl.close();
    process.exit(1);
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    console.error("No private key found. Set PRIVATE_KEY in .env or create .privateKey file");
    rl.close();
    process.exit(1);
  }

  // Fetch upcoming events
  console.log("Fetching upcoming events...\n");
  const events = await fetchUpcomingEvents(5);

  if (events.length === 0) {
    console.log("No upcoming events found.");
    rl.close();
    return;
  }

  // Display events
  console.log("Upcoming events:");
  console.log("─────────────────────────────────────────────────────────\n");

  for (let i = 0; i < events.length; i++) {
    const event = events[i].event;
    console.log(`  ${i + 1}. ${event.name}`);
    console.log(`     ${formatDateTime(event.start_at)} - ${formatDateTime(event.end_at)}`);
    console.log("");
  }

  // Ask for selection
  const selection = await question("Select event (1-5)", "1");
  const index = parseInt(selection) - 1;

  if (index < 0 || index >= events.length) {
    console.error("Invalid selection");
    rl.close();
    return;
  }

  const selectedEvent = events[index].event;
  console.log(`\nSelected: ${selectedEvent.name}\n`);

  // Fetch attendees
  console.log("Fetching attendees...");
  const { approved, total } = await fetchEventGuests(selectedEvent.api_id);

  console.log(`\nTotal registered: ${total}`);
  console.log(`Approved:         ${approved.length}`);

  // Filter by ONLY_SEND_TO if set
  let recipients = approved.filter((g) => g.email);
  if (ONLY_SEND_TO) {
    recipients = recipients.filter((g) => ONLY_SEND_TO.includes(g.email.toLowerCase()));
    console.log(`\n⚠️  ONLY_SEND_TO is set: ${ONLY_SEND_TO.join(", ")}`);
    console.log(`   Will send to: ${recipients.length} recipient(s)`);
  }

  if (recipients.length === 0) {
    console.log("\nNo recipients to notify.");
    rl.close();
    return;
  }

  // Show recipients
  console.log("\nRecipients:");
  recipients.forEach((g) => console.log(`  - ${g.name} <${g.email}>`));

  // Safety check
  console.log("\n─────────────────────────────────────────────────────────");
  if (ONLY_SEND_TO) {
    console.log("✓ Safe mode: ONLY_SEND_TO whitelist is active");
  } else {
    console.log("⚠️  PRODUCTION MODE: Emails will be sent to ALL approved attendees");
  }

  if (!RESEND_API_KEY) {
    console.log("\n❌ RESEND_API_KEY is not set. Cannot send emails.");
    rl.close();
    return;
  }

  const confirm = await question("\nProceed with sending emails? (yes/no)", "no");
  if (confirm.toLowerCase() !== "yes") {
    console.log("Aborted.");
    rl.close();
    return;
  }

  // Load template
  let template;
  try {
    template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  } catch (error) {
    console.error(`Failed to load template: ${error.message}`);
    rl.close();
    return;
  }

  // Send emails
  console.log("\nSending emails...\n");

  const startTime = Math.floor(new Date(selectedEvent.start_at).getTime() / 1000);
  const endTime = Math.floor(new Date(selectedEvent.end_at).getTime() / 1000);
  const duration = Math.ceil((endTime - startTime) / 60);
  const hostName = selectedEvent.host?.name || "Commons Hub";
  const eventUrl = selectedEvent.url || `https://lu.ma/${selectedEvent.api_id}`;

  const startDate = new Date(selectedEvent.start_at);
  const endDate = new Date(selectedEvent.end_at);
  const eventDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TIMEZONE,
  });
  const eventTime = `${startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })} - ${endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })}`;

  let sent = 0;
  let failed = 0;

  for (const guest of recipients) {
    try {
      const doorAccessUrl = await generateDoorAccessURL(
        {
          name: guest.name || "Guest",
          host: hostName,
          reason: selectedEvent.name,
          startTime,
          duration,
          eventUrl,
        },
        privateKey
      );

      let content = template
        .replace(/\{\{name\}\}/g, guest.name || "Guest")
        .replace(/\{\{eventName\}\}/g, selectedEvent.name)
        .replace(/\{\{hostName\}\}/g, hostName)
        .replace(/\{\{eventDate\}\}/g, eventDate)
        .replace(/\{\{eventTime\}\}/g, eventTime)
        .replace(/\{\{eventUrl\}\}/g, eventUrl)
        .replace(/\{\{doorAccessUrl\}\}/g, doorAccessUrl);

      await sendEmail(
        guest.email,
        `Door Access for ${selectedEvent.name} at Commons Hub`,
        content
      );

      console.log(`  ✓ ${guest.name} <${guest.email}>`);
      sent++;
    } catch (error) {
      console.log(`  ✗ ${guest.name} <${guest.email}> - ${error.message}`);
      failed++;
    }
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`Sent:   ${sent}`);
  console.log(`Failed: ${failed}`);
  console.log("\nDone!");

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
