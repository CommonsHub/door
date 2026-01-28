/**
 * CitizenWallet forbidden page
 * Displayed when user has CitizenWallet but no token balance
 */
export function generateForbiddenPage(profile) {
  const body = `
  <img src="/commonshub-icon.svg" class="logo" />
  <div style="text-align: center; padding: 10px;">
    <h2>You need to be a member to access this door</h2>
  <p>Please join the Commons Hub to earn some tokens and try again.</p>
  </div>
  <a href="https://app.citizenwallet.xyz/close" >Close</a>
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
