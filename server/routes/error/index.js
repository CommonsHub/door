/**
 * Error test route - GET /error
 * Test page for previewing error states
 * Query params: ?reason=[early|late|invalid]
 */
import { generateCommonsHubPage } from "../../components/commons-hub-page.html.js";

export default function registerErrorRoute(app) {
  app.get("/error", async (req, res) => {
    const reason = req.query.reason || "early";
    const now = Math.floor(Date.now() / 1000);

    // Generate sample event data
    const eventName = "Sample Event: Tech Meetup";
    const eventUrl = "https://lu.ma/sample-event";

    let error, startTime, duration;

    switch (reason) {
      case "late":
        // Event ended 2 hours ago
        startTime = now - 7200; // 2 hours ago
        duration = 60; // 1 hour duration
        error = "Event access period has expired";
        break;
      case "invalid":
        // Invalid signature
        startTime = now;
        duration = 120;
        error = "Invalid signature: signature verification failed";
        break;
      case "early":
      default:
        // Event starts in 2 hours
        startTime = now + 7200; // 2 hours from now
        duration = 120; // 2 hours duration
        error = "Event has not started yet";
    }

    // Calculate event timing for error message
    let validityMessage = "";

    if (startTime && duration) {
      const startDate = new Date(startTime * 1000);
      const endDate = new Date((startTime + duration * 60) * 1000);
      const dateOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true };

      const dateStr = startDate.toLocaleDateString("en-US", dateOptions);
      const startTimeStr = startDate.toLocaleTimeString("en-US", timeOptions);
      const endTimeStr = endDate.toLocaleTimeString("en-US", timeOptions);

      validityMessage = `
      <div class="validity-info">
        <h2>When is this code valid?</h2>
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Time:</strong> ${startTimeStr} - ${endTimeStr}</p>
      </div>
    `;
    }

    const errorHtml = generateCommonsHubPage({
      title: "Access Denied - Commons Hub",
      heading: "Access Denied",
      message: error,
      validityInfo: validityMessage,
      eventName: eventName,
      eventUrl: eventUrl,
      isSuccess: false,
      testInfo:
        "Test Mode - Try: /error?reason=early | /error?reason=late | /error?reason=invalid",
    });

    return res.status(403).send(errorHtml);
  });
}
