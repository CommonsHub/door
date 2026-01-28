/**
 * Signature-based access success page
 * Shows welcome message and redirects to event URL
 */
import { generateCommonsHubPage } from "../../components/commons-hub-page.html.js";

export function generateSignatureSuccessPage({ name, eventName, eventUrl }) {
  return generateCommonsHubPage({
    title: "Welcome - Commons Hub",
    heading: "Welcome to Commons Hub!",
    message: `Welcome to the Commons Hub for <strong>${eventName}</strong>.<br /><br />🚪 Push the door when you hear the buzz.<br />(<i>didn't work? Refresh the page to try again<i>).<br /><br />`,
    eventName,
    eventUrl,
    isSuccess: true,
  });
}
