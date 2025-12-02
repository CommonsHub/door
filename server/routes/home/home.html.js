/**
 * Home page HTML template
 * Shows door access log and today's visitors
 */
import { avatarGrid, logRow } from "../../components/avatar-grid.html.js";

export function generateHomePage(doorlog, todayUsers, users) {
  const body = `
  <img src="/commonshub-icon.svg" class="logo" />
  ${avatarGrid(todayUsers, users)}
  <h2>Door Access Log</h2>
  ${
    doorlog.length > 0
      ? doorlog
          .slice(-10)
          .reverse()
          .map((log) => logRow(log, users))
          .join("\n")
      : "<p>No door activity recorded yet</p>"
  }
`;

  const html = `
  <html>
    <head>
      <link rel="stylesheet" href="/styles.css">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>${body}</body>
  </html>
`;

  return html;
}
