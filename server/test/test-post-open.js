#!/usr/bin/env node
/**
 * Simple test for POST /open endpoint
 * Tests token-based authentication
 */

import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const TEST_USER_ID = "1367797098321285173"; // @zak
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const SECRET = process.env.SECRET || "";

console.log("=== POST /open Token Test ===\n");

// Generate token (same algorithm as server)
const token = crypto
  .createHash("md5")
  .update([GUILD_ID, TEST_USER_ID, SECRET].join(":"))
  .digest("hex");

console.log(`User ID: ${TEST_USER_ID} (@zak)`);
console.log(`Guild ID: ${GUILD_ID}`);
console.log(`Token: ${token.substring(0, 8)}...${token.substring(token.length - 8)}\n`);

// Check if server is running
console.log("Checking if server is running...");
try {
  const healthCheck = await fetch("http://localhost:3000/check");
  console.log("✓ Server is running\n");
} catch (error) {
  console.log("❌ Server not running on port 3000");
  console.log("   Start server with: npm start\n");
  process.exit(1);
}

// Make POST request
console.log("Making POST request to /open...");
try {
  const response = await fetch("http://localhost:3000/open", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `token=${token}&userid=${TEST_USER_ID}`,
  });

  const responseText = await response.text();
  const statusCode = response.status;

  console.log(`Status: ${statusCode}`);
  console.log(`Response: ${responseText}\n`);

  if (statusCode === 200) {
    console.log("✅ TEST PASSED - Token authentication successful");
    process.exit(0);
  } else {
    console.log("❌ TEST FAILED - Expected 200, got " + statusCode);
    process.exit(1);
  }
} catch (error) {
  console.log(`❌ TEST FAILED - ${error.message}`);
  process.exit(1);
}
