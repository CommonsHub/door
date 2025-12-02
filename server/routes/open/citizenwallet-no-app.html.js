/**
 * CitizenWallet no app landing page
 * Displays when user visits without any authentication
 */
export function generateNoAppPage(community) {
  const body = `
  <img src="/commonshub-icon.svg" class="logo" />
  <div style="text-align: center; padding: 10px;">
    <h1>Welcome to the Commons Hub!</h1>
    <p>To open the door, scan the QR Code from <a href="https://app.citizenwallet.xyz/#/?alias=${community.community.alias}&dl=onboarding">the Citizen Wallet</a> or type "open" in the <a href="https://discord.com/channels/1280532848604086365/1306678821751230514">#door channel on Discord</a>.</p>
    <div class="btn"><span class="emoji">🚪</span><a href="https://discord.com/channels/1280532848604086365/1306678821751230514">Open the #door channel on Discord</a></div>
    <p>Not a member yet? <a href="https://commonshub.brussels">Join the Commons Hub Community!</a></p>
    <div class="btn"><span class="emoji">🗓️</span><a href="https://lu.ma/commonshub_bxl">Upcoming events</a></div>
    <div class="btn"><span class="emoji">🙋🏻‍♀️</span><a href="https://instagram.com/commonshub_bxl">Follow us on Instagram</a></div>
    <div class="btn"><span class="emoji">👨🏻‍💼</span><a href="https://www.linkedin.com/company/commonshub-brussels">Follow us on LinkedIn</a></div>
    <div class="btn"><span class="emoji">📝</span><a href="https://map.commonshub.brussels">Leave a review on Google Maps</a></div>
  </div>
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
