/**
 * Success test route - GET /success
 * Test page for previewing success state
 */
import { generateCommonsHubPage } from "../../components/commons-hub-page.html.js";

export default function registerSuccessRoute(app) {
  app.get("/success", async (req, res) => {
    const eventName = "Sample Event: Tech Meetup";
    const eventUrl = "https://lu.ma/sample-event";

    const html = generateCommonsHubPage({
      title: "Welcome - Commons Hub",
      heading: "Welcome to Commons Hub!",
      message: `Welcome to the Commons Hub for <strong>${eventName}</strong>.<br /><br />🚪 Push the door when you hear the buzz.<br />(<i>didn't work? Refresh the page to try again<i>).<br /><br />`,
      eventName: eventName,
      eventUrl: eventUrl,
      isSuccess: true,
      testInfo:
        "Test Mode - The page will redirect to the event URL after 3 seconds",
    });

    return res.send(html);
  });
}
