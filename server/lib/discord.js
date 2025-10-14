import dotenv from "dotenv";
dotenv.config();

import { REST, Routes } from "discord.js";
const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN is not set");
}

if (!channelId) {
  throw new Error("DISCORD_CHANNEL_ID is not set");
}

const rest = new REST({ version: "10" }).setToken(token);

export async function sendDiscordMessage(content) {
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
export async function getMembers(guildId, roleId) {
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

export async function removeRole(guild, roleId, memberId) {
  console.log(">>> discord rest api: Removing role", roleId, "from", memberId);
  await rest.delete(Routes.guildMemberRole(guild, memberId, roleId));
}
