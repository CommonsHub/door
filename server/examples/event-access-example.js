#!/usr/bin/env node
/**
 * Example: Generating door access for an event
 *
 * This example shows how an event organizer would generate
 * signed door access URLs for their attendees.
 */

import { generateSignedURL, generateImmediateAccess, generateScheduledAccess } from '../scripts/signature-utils.js';

// In production, load from environment variable
const PRIVATE_KEY = process.env.ORGANIZER_PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";
const DOOR_URL = process.env.DOOR_URL || "http://localhost:3000";

console.log("╔════════════════════════════════════════════════════════╗");
console.log("║  Event Door Access Examples                            ║");
console.log("╚════════════════════════════════════════════════════════╝\n");

// Example 1: Workshop starting now
async function example1_WorkshopNow() {
  console.log("Example 1: Workshop Starting Now");
  console.log("─────────────────────────────────────────────────────────");

  const url = await generateImmediateAccess({
    attendeeName: "Alice Johnson",
    hostId: "TechEducation",
    eventName: "React Workshop",
    durationMinutes: 180 // 3 hours
  }, PRIVATE_KEY, DOOR_URL);

  console.log("Attendee: Alice Johnson");
  console.log("Event: React Workshop");
  console.log("Duration: 3 hours");
  console.log("Access URL:");
  console.log(url);
  console.log("\n✅ Alice can use this URL now and for the next 3 hours\n");

  return url;
}

// Example 2: Conference scheduled for tomorrow
async function example2_ConferenceTomorrow() {
  console.log("Example 2: Conference Tomorrow");
  console.log("─────────────────────────────────────────────────────────");

  // Create a date for tomorrow at 9 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const url = await generateScheduledAccess({
    attendeeName: "Bob Smith",
    hostId: "DevConf2025",
    eventName: "Developer Conference 2025",
    startTime: tomorrow,
    durationMinutes: 480 // 8 hours (9 AM - 5 PM)
  }, PRIVATE_KEY, DOOR_URL);

  console.log("Attendee: Bob Smith");
  console.log("Event: Developer Conference 2025");
  console.log(`Start: ${tomorrow.toLocaleString()}`);
  console.log("Duration: 8 hours");
  console.log("Access URL:");
  console.log(url);
  console.log("\n✅ Bob can use this URL tomorrow from 9 AM to 5 PM\n");

  return url;
}

// Example 3: Multi-day event pass
async function example3_MultiDayEvent() {
  console.log("Example 3: Multi-Day Event Pass");
  console.log("─────────────────────────────────────────────────────────");

  const eventStart = new Date();
  eventStart.setHours(8, 0, 0, 0); // Today at 8 AM

  const url = await generateScheduledAccess({
    attendeeName: "Carol Williams",
    hostId: "StartupWeek",
    eventName: "Startup Week Brussels",
    startTime: eventStart,
    durationMinutes: 4320 // 72 hours (3 days)
  }, PRIVATE_KEY, DOOR_URL);

  console.log("Attendee: Carol Williams");
  console.log("Event: Startup Week Brussels");
  console.log(`Start: ${eventStart.toLocaleString()}`);
  console.log("Duration: 3 days");
  console.log("Access URL:");
  console.log(url);
  console.log("\n✅ Carol can use this URL for 3 days starting from 8 AM today\n");

  return url;
}

// Example 4: Evening event with buffer time
async function example4_EveningEvent() {
  console.log("Example 4: Evening Event with Buffer");
  console.log("─────────────────────────────────────────────────────────");

  // Event at 6 PM today
  const eventTime = new Date();
  eventTime.setHours(18, 0, 0, 0);

  // But allow access 30 minutes early for setup
  const accessStart = new Date(eventTime);
  accessStart.setMinutes(accessStart.getMinutes() - 30);

  const url = await generateScheduledAccess({
    attendeeName: "David Lee",
    hostId: "NetworkingNights",
    eventName: "Web3 Networking Night",
    startTime: accessStart,
    durationMinutes: 210 // 3.5 hours (5:30 PM - 9 PM)
  }, PRIVATE_KEY, DOOR_URL);

  console.log("Attendee: David Lee");
  console.log("Event: Web3 Networking Night");
  console.log(`Access starts: ${accessStart.toLocaleString()} (30 min early)`);
  console.log(`Event starts: ${eventTime.toLocaleString()}`);
  console.log("Duration: 3.5 hours");
  console.log("Access URL:");
  console.log(url);
  console.log("\n✅ David can arrive 30 minutes early and stay until 9 PM\n");

  return url;
}

// Example 5: VIP all-day access
async function example5_VIPAccess() {
  console.log("Example 5: VIP All-Day Access");
  console.log("─────────────────────────────────────────────────────────");

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Midnight

  const url = await generateScheduledAccess({
    attendeeName: "Emma Davis (VIP)",
    hostId: "CommonsHub",
    eventName: "VIP Day Pass",
    startTime: today,
    durationMinutes: 1440 // 24 hours
  }, PRIVATE_KEY, DOOR_URL);

  console.log("Attendee: Emma Davis (VIP)");
  console.log("Event: VIP Day Pass");
  console.log("Duration: 24 hours");
  console.log("Access URL:");
  console.log(url);
  console.log("\n✅ Emma has all-day access\n");

  return url;
}

// Example 6: Generate multiple URLs for a batch of attendees
async function example6_BatchGeneration() {
  console.log("Example 6: Batch Generation for Team");
  console.log("─────────────────────────────────────────────────────────");

  const attendees = [
    "Frank Wilson",
    "Grace Taylor",
    "Henry Brown",
    "Iris Martinez"
  ];

  const eventStart = Math.floor(Date.now() / 1000); // Now

  console.log("Generating access for team offsite...\n");

  for (const attendee of attendees) {
    const url = await generateSignedURL({
      name: attendee,
      host: "CompanyOffsite",
      reason: "Team Building Day",
      startTime: eventStart,
      duration: 480 // 8 hours
    }, PRIVATE_KEY, DOOR_URL);

    console.log(`${attendee}:`);
    console.log(url);
    console.log();
  }

  console.log("✅ All team members have access for 8 hours\n");
}

// Run all examples
async function runExamples() {
  try {
    await example1_WorkshopNow();
    await example2_ConferenceTomorrow();
    await example3_MultiDayEvent();
    await example4_EveningEvent();
    await example5_VIPAccess();
    await example6_BatchGeneration();

    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║  How to Use These URLs                                 ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    console.log("1. Copy any URL above");
    console.log("2. Share with the attendee via:");
    console.log("   - Email");
    console.log("   - SMS");
    console.log("   - QR code");
    console.log("   - Event platform");
    console.log("3. Attendee opens the URL in their browser");
    console.log("4. Door opens automatically if within time window\n");

    console.log("⚠️  Security Notes:");
    console.log("   - URLs are bearer tokens (anyone with URL has access)");
    console.log("   - Only share URLs with authorized attendees");
    console.log("   - URLs automatically expire after the time window");
    console.log("   - All access is logged to Discord for audit\n");

  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export {
  example1_WorkshopNow,
  example2_ConferenceTomorrow,
  example3_MultiDayEvent,
  example4_EveningEvent,
  example5_VIPAccess,
  example6_BatchGeneration
};
