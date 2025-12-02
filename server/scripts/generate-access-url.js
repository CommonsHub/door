#!/usr/bin/env node
import { Wallet } from "ethers";
import readline from "readline";

/**
 * Interactive CLI tool to generate signed door access URLs
 *
 * Usage: node scripts/generate-access-url.js
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
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

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  Door Access URL Generator                             ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Get private key
  const privateKey = await question("Enter private key (or press Enter for demo key): ");
  const finalPrivateKey = privateKey.trim() || "0x0123456789012345678901234567890123456789012345678901234567890123";

  let wallet;
  try {
    wallet = new Wallet(finalPrivateKey);
    console.log(`\n✅ Wallet loaded: ${wallet.address}\n`);
  } catch (error) {
    console.error("❌ Invalid private key:", error.message);
    rl.close();
    return;
  }

  // Get access parameters
  console.log("Event Details:");
  console.log("─────────────────────────────────────────────────────────\n");

  const name = await question("Name of person requesting access: ");
  const host = await question("Event organiser identifier: ");
  const reason = await question("Event name/reason: ");

  console.log("\nTime Window:");
  console.log("─────────────────────────────────────────────────────────\n");

  const startOption = await question("Start time (1=now, 2=specific time): ");
  let startTime;

  if (startOption.trim() === "2") {
    const startMinutes = await question("Minutes from now to start (negative for past): ");
    const offsetSeconds = parseInt(startMinutes) * 60;
    startTime = Math.floor(Date.now() / 1000) + offsetSeconds;

    const startDate = new Date(startTime * 1000);
    console.log(`Start time: ${startDate.toLocaleString()}`);
  } else {
    startTime = Math.floor(Date.now() / 1000);
    console.log("Start time: Now");
  }

  const durationInput = await question("Duration in minutes: ");
  const duration = parseInt(durationInput);

  const endTime = startTime + (duration * 60);
  const endDate = new Date(endTime * 1000);
  console.log(`End time: ${endDate.toLocaleString()} (${formatDuration(duration)})\n`);

  // Generate signature
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}`;

  console.log("Signing message...");
  const signature = await wallet.signMessage(message);

  // Build URL
  const baseUrl = await question("\nServer URL (default: http://localhost:3000): ") || "http://localhost:3000";
  const url = `${baseUrl.replace(/\/$/, '')}/open?name=${encodeURIComponent(name)}&host=${encodeURIComponent(host)}&reason=${encodeURIComponent(reason)}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&sig=${encodeURIComponent(signature)}`;

  // Display results
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Generated Access URL                                  ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Full URL:");
  console.log(url);

  console.log("\n\nCurl command:");
  console.log(`curl "${url}"`);

  console.log("\n\nQR Code URL (shorten this for best results):");
  console.log(url);

  console.log("\n\nAccess Details:");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`Name:          ${name}`);
  console.log(`Host:          ${host}`);
  console.log(`Reason:        ${reason}`);
  console.log(`Start Time:    ${new Date(startTime * 1000).toLocaleString()}`);
  console.log(`End Time:      ${new Date(endTime * 1000).toLocaleString()}`);
  console.log(`Duration:      ${formatDuration(duration)}`);
  console.log(`Signed By:     ${wallet.address}`);
  console.log("─────────────────────────────────────────────────────────\n");

  console.log("⚠️  Make sure the wallet address is authorized in authorized_keys.json\n");

  rl.close();
}

main().catch(error => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
