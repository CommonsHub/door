/**
 * Signature-based access success page
 * Shows welcome message and redirects to event URL
 */
import { generateCommonsHubPage } from "../../components/commons-hub-page.html.js";

export function generateSignatureSuccessPage({ name, eventName, eventUrl }) {
  return generateCommonsHubPage({
    title: "Welcome - Commons Hub",
    heading: "Welcome to Commons Hub!",
    message: `Welcome to the Commons Hub for <strong>${eventName}</strong>.${
      eventUrl ? " Redirecting you to your event page..." : ""
    }`,
    eventName,
    eventUrl,
    isSuccess: true,
  });
}
