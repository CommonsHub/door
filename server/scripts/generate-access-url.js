#!/usr/bin/env node
import { Wallet } from "ethers";
import readline from "readline";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(serverDir, ".env") });

function loadPrivateKeyFromFile() {
  const keyPath = path.join(serverDir, ".privateKey");
  try {
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, "utf8").trim();
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

/**
 * Interactive CLI tool to generate signed door access URLs
 *
 * Usage: npm run generate-url
 */

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
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Door Access URL Generator                             ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Get private key from env, .privateKey file, or prompt
  let privateKey = process.env.PRIVATE_KEY;
  let keySource = "PRIVATE_KEY env";
  let wallet;

  if (!privateKey) {
    privateKey = loadPrivateKeyFromFile();
    keySource = ".privateKey file";
  }

  if (privateKey) {
    try {
      wallet = new Wallet(privateKey);
      console.log(`Using private key from ${keySource}`);
      console.log(`Wallet address: ${wallet.address}\n`);
    } catch (error) {
      console.error(`Invalid private key in ${keySource}:`, error.message);
      privateKey = null;
    }
  }

  if (!privateKey) {
    privateKey = await question("Enter private key");
    if (!privateKey) {
      console.error("Private key is required");
      rl.close();
      return;
    }
    try {
      wallet = new Wallet(privateKey);
      console.log(`Wallet address: ${wallet.address}\n`);
    } catch (error) {
      console.error("Invalid private key:", error.message);
      rl.close();
      return;
    }
  }

  // Get access parameters with defaults
  console.log("Event Details:");
  console.log("─────────────────────────────────────────────────────────\n");

  const name = await question("Name of person requesting access");
  if (!name) {
    console.error("Name is required");
    rl.close();
    return;
  }

  const host = await question("Event organizer", "Commons Hub");
  const reason = await question("Event name/reason", "Visitor");

  console.log("\nTime Window:");
  console.log("─────────────────────────────────────────────────────────\n");

  const durationInput = await question("Duration in minutes", "60");
  const duration = parseInt(durationInput) || 60;

  const startTime = Math.floor(Date.now() / 1000);
  const endTime = startTime + duration * 60;

  console.log(`\nAccess window: Now -> ${new Date(endTime * 1000).toLocaleString()} (${formatDuration(duration)})`);

  // Generate signature
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}`;

  const signature = await wallet.signMessage(message);

  // Build URL
  const defaultUrl = process.env.DOOR_URL || "https://door.commonshub.brussels";
  const baseUrl = await question("\nServer URL", defaultUrl);
  const url = `${baseUrl.replace(/\/$/, "")}/open?name=${encodeURIComponent(name)}&host=${encodeURIComponent(host)}&reason=${encodeURIComponent(reason)}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&sig=${encodeURIComponent(signature)}`;

  // Display results
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Generated Access URL                                  ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log(url);

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`Name:       ${name}`);
  console.log(`Host:       ${host}`);
  console.log(`Reason:     ${reason}`);
  console.log(`Valid:      Now - ${new Date(endTime * 1000).toLocaleString()}`);
  console.log(`Duration:   ${formatDuration(duration)}`);
  console.log(`Signed by:  ${wallet.address}`);
  console.log("─────────────────────────────────────────────────────────\n");

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
