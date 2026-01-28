#!/usr/bin/env node
/**
 * Send a test door access email
 *
 * Usage: npm run send-test-email
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

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DOOR_URL = process.env.DOOR_URL || "https://door.commonshub.brussels";
const FROM_EMAIL = process.env.FROM_EMAIL || "hello@commonshub.brussels";
const ONLY_SEND_TO = process.env.ONLY_SEND_TO
  ? process.env.ONLY_SEND_TO.split(",")[0].trim()
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

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
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
  console.log("║  Send Test Email                                       ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const privateKey = getPrivateKey();
  if (!privateKey) {
    console.error("No private key found. Set PRIVATE_KEY in .env or create .privateKey file");
    rl.close();
    process.exit(1);
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is required");
    rl.close();
    process.exit(1);
  }

  // Collect information
  const email = await question("Email address", ONLY_SEND_TO || "");
  if (!email) {
    console.error("Email is required");
    rl.close();
    return;
  }

  const name = await question("Recipient name", "Test User");
  const eventName = await question("Event name", "Test Event");
  const hostName = await question("Host name", "Commons Hub");
  const durationStr = await question("Duration in minutes", "60");
  const duration = parseInt(durationStr) || 60;

  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + duration * 60;

  const startDate = new Date(startTime * 1000);
  const endDate = new Date(endTime * 1000);

  const eventDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const eventTime = `${startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const eventUrl = "https://commonshub.brussels";

  // Summary
  console.log("\n─────────────────────────────────────────────────────────");
  console.log("Email details:");
  console.log(`  To:        ${name} <${email}>`);
  console.log(`  Event:     ${eventName}`);
  console.log(`  Host:      ${hostName}`);
  console.log(`  Date:      ${eventDate}`);
  console.log(`  Time:      ${eventTime}`);
  console.log(`  Duration:  ${formatDuration(duration)}`);
  console.log("─────────────────────────────────────────────────────────\n");

  const confirm = await question("Send email? (yes/no)", "yes");
  if (confirm.toLowerCase() !== "yes") {
    console.log("Aborted.");
    rl.close();
    return;
  }

  // Generate URL
  console.log("\nGenerating door access URL...");
  const doorAccessUrl = await generateDoorAccessURL(
    {
      name,
      host: hostName,
      reason: eventName,
      startTime,
      duration,
      eventUrl,
    },
    privateKey
  );

  // Load and populate template
  let template;
  try {
    template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  } catch (error) {
    console.error(`Failed to load template: ${error.message}`);
    rl.close();
    return;
  }

  const content = template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{eventName\}\}/g, eventName)
    .replace(/\{\{hostName\}\}/g, hostName)
    .replace(/\{\{eventDate\}\}/g, eventDate)
    .replace(/\{\{eventTime\}\}/g, eventTime)
    .replace(/\{\{eventUrl\}\}/g, eventUrl)
    .replace(/\{\{doorAccessUrl\}\}/g, doorAccessUrl);

  // Send email
  console.log("Sending email...");
  try {
    const result = await sendEmail(
      email,
      `Door Access for ${eventName} at Commons Hub`,
      content
    );
    console.log(`\n✓ Email sent successfully (ID: ${result.id})`);
    console.log(`\nDoor access URL:\n${doorAccessUrl}`);
  } catch (error) {
    console.error(`\n✗ Failed to send email: ${error.message}`);
  }

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
