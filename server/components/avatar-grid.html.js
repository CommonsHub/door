/**
 * Avatar grid component showing today's visitors
 * Used by: home page, CitizenWallet success page
 */

const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

export function avatarGrid(todayUsers, users) {
  if (todayUsers.length === 0) {
    return "<p>No visitors today</p>";
  }

  const avatars = todayUsers
    .map((userid) => {
      const user = users[userid];

      return `
      <div class="today-user">
        <img class="today-avatar" src="${
          user?.avatar || DEFAULT_AVATAR
        }" alt="Avatar">
        <div class="today-name">${
          user?.username || user?.tag || "Unknown"
        }</div>
      </div>
    `;
    })
    .join("");

  return `
    <div class="today-visitors">
      <h2>Today's Visitors</h2>
      <div class="avatar-grid">
        ${avatars}
      </div>
    </div>
  `;
}

export function logRow(log, users) {
  const user = users[log.userid];

  return `
    <div class="log-entry">
      <img class="avatar" src="${user?.avatar || DEFAULT_AVATAR}" alt="Avatar">
      <div class="log-content">
        <div class="username">${
          user?.displayName || user?.tag || "Unknown User"
        }</div>
        <div class="timestamp">${log.timestamp}</div>
      </div>
    </div>
  `;
}
