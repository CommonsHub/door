/**
 * Signature-based access error page
 * Shows access denied message with event timing information
 */
import { generateCommonsHubPage } from "../../components/commons-hub-page.html.js";

export function generateSignatureErrorPage({
  error,
  eventName,
  eventUrl,
  startTime,
  duration,
}) {
  let validityMessage = "";

  if (startTime && duration) {
    const bufferMinutes = 30;
    const startDate = new Date((startTime - bufferMinutes * 60) * 1000);
    const endDate = new Date((startTime + duration * 60 + bufferMinutes * 60) * 1000);
    const dateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

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

  return generateCommonsHubPage({
    title: "Access Denied - Commons Hub",
    heading: "Access Denied",
    message: error,
    validityInfo: validityMessage,
    eventName,
    eventUrl,
    isSuccess: false,
  });
}
