import { Wallet } from "ethers";

/**
 * Utility functions for signature-based door access
 * Use these functions to integrate door access into your application
 */

/**
 * Generate a signed URL for door access
 * @param {Object} params - Access parameters
 * @param {string} params.name - Name of the person requesting access
 * @param {string} params.host - Event organiser identifier
 * @param {string} params.reason - Event name or reason for access
 * @param {number} params.startTime - Unix timestamp when access starts (in seconds)
 * @param {number} params.duration - Duration of access in minutes
 * @param {string} privateKey - Ethereum private key (must be whitelisted)
 * @param {string} baseUrl - Base URL of the door server (default: http://localhost:3000)
 * @returns {Promise<string>} Complete URL with signature
 */
export async function generateSignedURL(params, privateKey, baseUrl = "http://localhost:3000") {
  const { name, host, reason, startTime, duration } = params;

  // Validate required parameters
  if (!name || !host || !reason || !startTime || !duration) {
    throw new Error("Missing required parameters: name, host, reason, startTime, duration");
  }

  // Create wallet from private key
  const wallet = new Wallet(privateKey);

  // Current timestamp for the request
  const timestamp = Math.floor(Date.now() / 1000);

  // Construct the message to sign (order matters!)
  const message = `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}`;

  // Sign the message
  const signature = await wallet.signMessage(message);

  // Construct the full URL
  const url = `${baseUrl.replace(/\/$/, '')}/open?name=${encodeURIComponent(name)}&host=${encodeURIComponent(host)}&reason=${encodeURIComponent(reason)}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&sig=${encodeURIComponent(signature)}`;

  return url;
}

/**
 * Generate access URL for an event starting now
 * @param {Object} event
 * @param {string} event.attendeeName - Name of attendee
 * @param {string} event.hostId - Event organizer identifier
 * @param {string} event.eventName - Name of the event
 * @param {number} event.durationMinutes - Duration in minutes
 * @param {string} privateKey - Ethereum private key
 * @param {string} baseUrl - Base URL of door server
 * @returns {Promise<string>} Signed URL
 */
export async function generateImmediateAccess(event, privateKey, baseUrl) {
  const now = Math.floor(Date.now() / 1000);

  return generateSignedURL({
    name: event.attendeeName,
    host: event.hostId,
    reason: event.eventName,
    startTime: now,
    duration: event.durationMinutes
  }, privateKey, baseUrl);
}

/**
 * Generate access URL for a future event
 * @param {Object} event
 * @param {string} event.attendeeName - Name of attendee
 * @param {string} event.hostId - Event organizer identifier
 * @param {string} event.eventName - Name of the event
 * @param {Date|number} event.startTime - Start time as Date object or Unix timestamp
 * @param {number} event.durationMinutes - Duration in minutes
 * @param {string} privateKey - Ethereum private key
 * @param {string} baseUrl - Base URL of door server
 * @returns {Promise<string>} Signed URL
 */
export async function generateScheduledAccess(event, privateKey, baseUrl) {
  const startTime = event.startTime instanceof Date
    ? Math.floor(event.startTime.getTime() / 1000)
    : event.startTime;

  return generateSignedURL({
    name: event.attendeeName,
    host: event.hostId,
    reason: event.eventName,
    startTime,
    duration: event.durationMinutes
  }, privateKey, baseUrl);
}

/**
 * Generate access URL for a time range
 * @param {Object} params
 * @param {string} params.attendeeName - Name of attendee
 * @param {string} params.hostId - Event organizer identifier
 * @param {string} params.eventName - Name of the event
 * @param {Date|number} params.startTime - Start time
 * @param {Date|number} params.endTime - End time
 * @param {string} privateKey - Ethereum private key
 * @param {string} baseUrl - Base URL of door server
 * @returns {Promise<string>} Signed URL
 */
export async function generateTimeRangeAccess(params, privateKey, baseUrl) {
  const startTime = params.startTime instanceof Date
    ? Math.floor(params.startTime.getTime() / 1000)
    : params.startTime;

  const endTime = params.endTime instanceof Date
    ? Math.floor(params.endTime.getTime() / 1000)
    : params.endTime;

  const durationSeconds = endTime - startTime;
  const durationMinutes = Math.floor(durationSeconds / 60);

  return generateSignedURL({
    name: params.attendeeName,
    host: params.hostId,
    reason: params.eventName,
    startTime,
    duration: durationMinutes
  }, privateKey, baseUrl);
}

/**
 * Get the public address from a private key
 * @param {string} privateKey - Ethereum private key
 * @returns {string} Ethereum address
 */
export function getAddressFromPrivateKey(privateKey) {
  const wallet = new Wallet(privateKey);
  return wallet.address;
}

/**
 * Create a new random wallet for testing
 * WARNING: Only use for testing, never in production without proper key management
 * @returns {Object} { privateKey, address }
 */
export function createTestWallet() {
  const wallet = Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address
  };
}

/**
 * Validate if a URL is still valid based on time window
 * @param {string} url - The signed URL
 * @returns {Object} { valid: boolean, reason: string }
 */
export function validateURLTimestamp(url) {
  const urlObj = new URL(url);
  const timestamp = parseInt(urlObj.searchParams.get("timestamp"));
  const startTime = parseInt(urlObj.searchParams.get("startTime"));
  const duration = parseInt(urlObj.searchParams.get("duration"));

  const now = Math.floor(Date.now() / 1000);

  // Check timestamp freshness (5 minute window)
  if (Math.abs(now - timestamp) > 300) {
    return { valid: false, reason: "Request timestamp expired (must be within 5 minutes)" };
  }

  // Check event time window
  const endTime = startTime + (duration * 60);

  if (now < startTime) {
    return { valid: false, reason: "Event has not started yet" };
  }

  if (now > endTime) {
    return { valid: false, reason: "Event access period has expired" };
  }

  return { valid: true, reason: "Valid" };
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Signature Utils Library");
  console.log("=======================\n");
  console.log("This is a utility library. Import it in your code:\n");
  console.log("import { generateSignedURL, generateImmediateAccess } from './scripts/signature-utils.js';\n");
  console.log("Example:\n");

  const example = `
import { generateImmediateAccess } from './scripts/signature-utils.js';

const url = await generateImmediateAccess({
  attendeeName: "John Doe",
  hostId: "MyOrganization",
  eventName: "Tech Meetup",
  durationMinutes: 180
}, process.env.PRIVATE_KEY, "https://door.example.com");

console.log("Access URL:", url);
`;

  console.log(example);
}
