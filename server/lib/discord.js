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

module.exports = { sendDiscordMessage };
