/**
 * CitizenWallet success page
 * Shows welcome with avatar and today's visitors
 */
import { avatarGrid } from "../../components/avatar-grid.html.js";

const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

export function generateCitizenWalletSuccessPage(profile, todayUsers, users) {
  const body = `
  <img src="${
    profile?.image_medium || DEFAULT_AVATAR
  }" alt="Avatar" class="avatar" style="height: 100px; width: 100px; border-radius: 50%;">
  <h1>Welcome ${profile?.username || "visitor"}!</h1>

  <h2>Door opened</h2>
  ${avatarGrid(todayUsers, users)}
  <a href="https://app.citizenwallet.xyz/close">Close</a>
`;

  const html = `
  <html>
    <head>
      <link rel="stylesheet" href="/styles.css">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>${body}</body>
    <script>
      setTimeout(() => {
        window.location.href = "https://app.citizenwallet.xyz/close";
      }, 5000);
    </script>
  </html>
`;

  return html;
}
