/**
 * Commons Hub branded page template
 * Used by: /open (signature success/error), /success, /error routes
 */
export function generateCommonsHubPage({
  title,
  heading,
  message,
  validityInfo,
  eventName,
  eventUrl,
  isSuccess = false,
  testInfo = null,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${
    isSuccess && eventUrl
      ? `<meta http-equiv="refresh" content="3;url=${eventUrl}">`
      : ""
  }
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      padding: 1rem;
    }
    .container {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e5e5;
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .logo {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
      display: block;
    }
    h1 {
      font-size: 1.875rem;
      font-weight: 600;
      color: #171717;
      margin-bottom: 0.75rem;
    }
    .message {
      font-size: 1.125rem;
      color: #525252;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .validity-info {
      background: #fafafa;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 2rem 0;
      text-align: left;
    }
    .validity-info h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #171717;
      margin-bottom: 1rem;
    }
    .validity-info p {
      font-size: 1rem;
      color: #525252;
      margin: 0.5rem 0;
    }
    .validity-info strong {
      color: #171717;
      font-weight: 600;
    }
    .button {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #FF4C02;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1rem;
      transition: background 0.2s;
      margin-top: 1rem;
    }
    .button:hover {
      background: #e54402;
    }
    .event-info {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e5e5;
      font-size: 0.875rem;
      color: #737373;
    }
    .event-info strong {
      color: #171717;
    }
    .test-info {
      margin-top: 2rem;
      padding: 1rem;
      background: #fafafa;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #737373;
    }
    @media (max-width: 640px) {
      .container { padding: 2rem 1.5rem; }
      h1 { font-size: 1.5rem; }
      .message { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/commonshub-icon.svg" class="logo" alt="Commons Hub" />
    <h1>${heading}</h1>
    <div class="message">${message}</div>
    ${validityInfo || ""}
    ${
      eventUrl
        ? `<a href="${eventUrl}" class="button">${
            isSuccess ? "Go to Event" : "View Event Details"
          }</a>`
        : ""
    }
    ${
      eventName
        ? `<div class="event-info">Event: <strong>${eventName}</strong></div>`
        : ""
    }
    ${testInfo ? `<div class="test-info">${testInfo}</div>` : ""}
  </div>
</body>
</html>
`;
}
