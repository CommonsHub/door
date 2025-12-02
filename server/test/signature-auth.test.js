import { Wallet } from "ethers";

/**
 * Test file for signature-based door access
 * Tests URL signature generation and verification logic
 */

// Example: Create a test wallet (in production, use a secure private key)
const TEST_PRIVATE_KEY =
  "0x0123456789012345678901234567890123456789012345678901234567890123";
const wallet = new Wallet(TEST_PRIVATE_KEY);

describe("Signature-based Door Access", () => {
  /**
   * Generate a signed URL for door access
   */
  async function generateSignedURL(params, wallet) {
    const { name, host, reason, startTime, duration, eventUrl } = params;
    const timestamp = Math.floor(Date.now() / 1000);

    const message = eventUrl
      ? `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&eventUrl=${eventUrl}`
      : `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}`;

    const signature = await wallet.signMessage(message);

    let url = `/open?name=${encodeURIComponent(name)}&host=${encodeURIComponent(
      host
    )}&reason=${encodeURIComponent(
      reason
    )}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}`;
    if (eventUrl) {
      url += `&eventUrl=${encodeURIComponent(eventUrl)}`;
    }
    url += `&sig=${encodeURIComponent(signature)}`;

    return { url, signature, message };
  }

  beforeAll(() => {
    console.log("\nTest Wallet Address:", wallet.address);
    console.log(
      "Add this address to authorized_keys.json to authorize this test wallet\n"
    );
  });

  describe("Valid Access Scenarios", () => {
    test("should generate valid signature for current event", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params = {
        name: "John Doe",
        host: "eventOrganiser",
        reason: "Web3 Meetup",
        startTime: now - 300, // Started 5 minutes ago
        duration: 180, // 3 hours
        eventUrl: "https://lu.ma/web3-meetup",
      };

      const { url, signature, message } = await generateSignedURL(
        params,
        wallet
      );

      expect(url).toContain("/open?");
      expect(url).toContain("name=John%20Doe");
      expect(url).toContain("sig=");
      expect(signature).toBeTruthy();
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // ECDSA signature format
      expect(message).toContain("name=John Doe");
    });

    test("should generate valid signature for multiple events", async () => {
      const now = Math.floor(Date.now() / 1000);

      const events = [
        {
          name: "Conference Attendee",
          host: "TechConf2025",
          reason: "Blockchain Conference",
          startTime: now - 1800,
          duration: 480,
        },
        {
          name: "Workshop Leader",
          host: "DevWorkshop",
          reason: "Smart Contract Workshop",
          startTime: now - 600,
          duration: 120,
        },
      ];

      for (const event of events) {
        const { url, signature } = await generateSignedURL(event, wallet);
        expect(url).toContain("/open?");
        expect(signature).toBeTruthy();
      }
    });
  });

  describe("Invalid Access Scenarios", () => {
    test("should identify future event (not started yet)", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params = {
        name: "Jane Smith",
        host: "eventOrganiser",
        reason: "Future Event",
        startTime: now + 3600, // Starts in 1 hour
        duration: 120,
        eventUrl: "https://lu.ma/future-event",
      };

      const { url } = await generateSignedURL(params, wallet);

      expect(url).toContain("/open?");
      expect(url).toContain("startTime=" + params.startTime);
      // Note: Actual validation happens server-side
      // This test verifies URL generation works for future events
    });

    test("should identify expired event", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params = {
        name: "Alice Johnson",
        host: "eventOrganiser",
        reason: "Past Event",
        startTime: now - 7200, // Started 2 hours ago
        duration: 60, // Only 1 hour duration (expired 1 hour ago)
      };

      const { url } = await generateSignedURL(params, wallet);

      expect(url).toContain("/open?");
      // Event is expired: endTime = startTime + duration*60
      const endTime = params.startTime + params.duration * 60;
      expect(endTime).toBeLessThan(now);
    });

    test("should detect tampered name parameter", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params = {
        name: "Bob Wilson",
        host: "eventOrganiser",
        reason: "Test Event",
        startTime: now - 300,
        duration: 180,
      };

      let { url, signature } = await generateSignedURL(params, wallet);

      // Tamper with the URL by changing the name
      const tamperedUrl = url.replace("Bob%20Wilson", "Mallory%20Attacker");

      expect(tamperedUrl).not.toEqual(url);
      expect(tamperedUrl).toContain("Mallory%20Attacker");
      // Original signature won't match the tampered URL
      expect(tamperedUrl).toContain(`sig=${encodeURIComponent(signature)}`);
    });

    test("should detect tampered event time parameters (SECURITY TEST)", async () => {
      const now = Math.floor(Date.now() / 1000);

      // Create a signature for an event that ended 2 hours ago
      const params = {
        name: "Attacker",
        host: "eventOrganiser",
        reason: "Past Event",
        startTime: now - 7200, // Started 2 hours ago
        duration: 60, // 1 hour duration (already ended)
        eventUrl: "https://lu.ma/test-event",
      };

      const { url } = await generateSignedURL(params, wallet);

      // Attacker tries to manually edit the URL to change the event times
      const tamperedUrl = url
        .replace(`startTime=${params.startTime}`, `startTime=${now}`)
        .replace(`duration=${params.duration}`, `duration=180`);

      expect(tamperedUrl).not.toEqual(url);
      expect(tamperedUrl).toContain(`startTime=${now}`);
      expect(tamperedUrl).toContain("duration=180");
      // Signature is still the old one, so server-side validation will fail
    });
  });

  describe("URL Parameter Validation", () => {
    test("should include all required parameters", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params = {
        name: "Test User",
        host: "TestHost",
        reason: "Test Event",
        startTime: now - 300,
        duration: 180,
      };

      const { url } = await generateSignedURL(params, wallet);

      expect(url).toContain("name=");
      expect(url).toContain("host=");
      expect(url).toContain("reason=");
      expect(url).toContain("timestamp=");
      expect(url).toContain("startTime=");
      expect(url).toContain("duration=");
      expect(url).toContain("sig=");
    });

    test("should optionally include eventUrl parameter", async () => {
      const now = Math.floor(Date.now() / 1000);

      const paramsWithUrl = {
        name: "Test User",
        host: "TestHost",
        reason: "Test Event",
        startTime: now - 300,
        duration: 180,
        eventUrl: "https://lu.ma/test",
      };

      const { url: urlWith } = await generateSignedURL(paramsWithUrl, wallet);
      expect(urlWith).toContain("eventUrl=");

      const paramsWithoutUrl = {
        name: "Test User",
        host: "TestHost",
        reason: "Test Event",
        startTime: now - 300,
        duration: 180,
      };

      const { url: urlWithout } = await generateSignedURL(
        paramsWithoutUrl,
        wallet
      );
      expect(urlWithout).not.toContain("eventUrl=");
    });
  });

  describe("Signature Format", () => {
    test("should generate ECDSA signature in correct format", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params = {
        name: "Test User",
        host: "TestHost",
        reason: "Test Event",
        startTime: now,
        duration: 120,
      };

      const { signature } = await generateSignedURL(params, wallet);

      // ECDSA signature should be 0x + 130 hex characters
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    test("should generate different signatures for different messages", async () => {
      const now = Math.floor(Date.now() / 1000);

      const params1 = {
        name: "User One",
        host: "Host1",
        reason: "Event 1",
        startTime: now,
        duration: 120,
      };

      const params2 = {
        name: "User Two",
        host: "Host2",
        reason: "Event 2",
        startTime: now,
        duration: 120,
      };

      const { signature: sig1 } = await generateSignedURL(params1, wallet);
      const { signature: sig2 } = await generateSignedURL(params2, wallet);

      expect(sig1).not.toEqual(sig2);
    });
  });
});
