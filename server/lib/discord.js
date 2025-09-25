const { REST, Routes } = require("discord.js");
const token = process.env.DISCORD_BOT_TOKEN;
const rest = new REST({ version: "10" }).setToken(token);
const channelId = process.env.DISCORD_CHANNEL_ID;

async function sendDiscordMessage(content) {
  if (!content) return;
  try {
    await rest.post(Routes.channelMessages(channelId), {
      body: { content },
    });
  } catch (error) {
    console.error("Failed to send Discord message via REST:", error);
  }
}

// use the rest api to get the members of the role
async function getMembers(guildId, roleId) {
  const all = [];
  let after = "0";
  const limit = 1000;

  while (true) {
    const params = new URLSearchParams({ limit: String(limit), after });
    const page = await rest.get(Routes.guildMembers(guildId), {
      query: params,
    });

    if (!page.length) break;
    all.push(...page);
    after = page[page.length - 1].user.id;
    if (page.length < limit) break;
  }

  const roleMembers = roleId
    ? all.filter((m) => m.roles?.includes(roleId))
    : all;
  return roleMembers;
}

async function removeRole(guild, roleId, memberId) {
  console.log(">>> discord rest api: Removing role", roleId, "from", memberId);
  await rest.delete(Routes.guildMemberRole(guild, memberId, roleId));
}

module.exports = { sendDiscordMessage, getMembers, removeRole };
