import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { loginWithCitizenWallet } from "./lib/citizenwallet/index.js";
import { sendDiscordMessage, getMembers, removeRole } from "./lib/discord.js";
import { loadJSON } from "./lib/utils.js";
import { createApp } from "./app.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";
import { verifyMessage, Wallet } from "ethers";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const community = loadJSON("./lib/citizenwallet/community.json");

const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

// Get bot token and allowed channel ID from the environment variables
const token = process.env.DISCORD_BOT_TOKEN;
const allowedChannelId = process.env.DISCORD_CHANNEL_ID;
const users = {};

const SECRET = process.env.SECRET || "";
const DRY_RUN = process.env.DRY_RUN === "true";

const presentToday = {};
const funFacts = [];

const d = new Date();
console.log(">>> door started", d.toISOString());
console.log(">>> current hour", d.getHours(), "Timezone:", process.env.TZ);

const rest = new REST({ version: "10" }).setToken(token);

const accessRoles = loadJSON("./access_roles.json");
const authorizedKeys = loadJSON("./authorized_keys.json");

const userIdToRoles = {};

// Private key management
const DATA_DIR = process.env.DATA_DIR || __dirname;
const PRIVATE_KEY_PATH = path.join(DATA_DIR, ".privateKey");

/**
 * Get or generate private key for event email signing
 */
function getOrCreatePrivateKey() {
  // Check environment variable first
  if (process.env.PRIVATE_KEY) {
    const wallet = new Wallet(process.env.PRIVATE_KEY);
    console.log(">>> 🔐 Using PRIVATE_KEY from environment");
    console.log(">>> 📬 Public address:", wallet.address);
    return process.env.PRIVATE_KEY;
  }

  // Check if key file exists
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8").trim();
    const wallet = new Wallet(privateKey);
    console.log(">>> 📂 Loaded private key from:", PRIVATE_KEY_PATH);
    console.log(">>> 📬 Public address:", wallet.address);
    return privateKey;
  }

  // Generate new private key
  console.log(">>> 🔑 Generating new private key...");
  const wallet = Wallet.createRandom();
  const privateKey = wallet.privateKey;

  // Save to file
  try {
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
    console.log(">>> ✅ Private key saved to:", PRIVATE_KEY_PATH);
    console.log(">>> 📬 Public address:", wallet.address);
    console.log(">>> ✅ Server public key automatically authorized");
  } catch (error) {
    console.error(">>> ❌ Failed to save private key:", error.message);
  }

  return privateKey;
}

// Initialize private key and log public address
const PRIVATE_KEY = getOrCreatePrivateKey();

// Add server's public key to authorized keys
const serverWallet = new Wallet(PRIVATE_KEY);
const serverPublicKey = serverWallet.address;

// Check if server key is already in authorized keys
const serverKeyExists = authorizedKeys.some(
  (key) => key.publicKey.toLowerCase() === serverPublicKey.toLowerCase(),
);

if (!serverKeyExists) {
  authorizedKeys.push({
    name: "Door Server",
    publicKey: serverPublicKey,
    description: "Auto-generated server key for event access emails",
  });
  console.log(">>> ✅ Server public key added to authorized keys");
}

// Append-only log file for all door access
const LOG_FILE = path.join(process.env.LOG_DIR || __dirname, "door_access.log");

/**
 * Append door access to log file
 * @param {string} name - Name of person accessing
 * @param {string} method - Access method (discord, citizenwallet, token, signature, shortcut)
 * @param {Object} metadata - Additional metadata
 */
function logDoorAccess(name, method, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    name,
    method,
    ...metadata,
  };

  const logLine = JSON.stringify(logEntry) + "\n";

  try {
    fs.appendFileSync(LOG_FILE, logLine, "utf8");
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

const reloadAccessRoles = async () => {
  for (const role of accessRoles) {
    DRY_RUN &&
      console.log(">>> Loading members for role", role.name, role.roleId);
    const members = await getMembers(process.env.DISCORD_GUILD_ID, role.roleId);
    DRY_RUN && console.log(">>> ", members.length, "members found");
    role.memberIds = [];
    for (const member of members) {
      userIdToRoles[member.user.id] = userIdToRoles[member.user.id] || [];
      if (!userIdToRoles[member.user.id].includes(role.roleId)) {
        userIdToRoles[member.user.id].push(role.roleId);
      }
      role.memberIds.push(member.user.id);
    }
    if (role.timeRange !== "anytime") {
      const hourRange = role.timeRange.split("-");
      role.hourRange = [parseInt(hourRange[0]), parseInt(hourRange[1])];
    }
  }

  if (DRY_RUN) {
    setTimeout(() => {
      console.log(">>> Testing message");
      handleMessage({
        author: {
          id: "337769522100568076",
          displayName: "Kris",
        },
        channelId: allowedChannelId,
        content: "open",
        reply: (message) => {
          console.log(">>> Reply: ", message);
        },
      });
    }, 1000 * 1);
  }

  console.log(">>> Access roles loaded");
};

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getOpeningHours(roleId) {
  const role = accessRoles.find((r) => r.roleId === roleId);
  if (!role) {
    return "never";
  }
  let days = "";
  if (role.daysOfWeek === "anytime" && role.timeRange === "anytime") {
    return "anytime";
  }
  if (role.daysOfWeek === "anytime") {
    days = "any day";
  } else {
    days = `on ${role.daysOfWeek.join(", ")}`;
  }
  let hours = "";
  if (role.timeRange === "anytime") {
    hours = "anytime";
  } else {
    hours = `between ${role.hourRange[0]} and ${role.hourRange[1]}`;
  }
  return `${days} ${hours}`;
}

function hasAccess(userid) {
  const userRoles = userIdToRoles[userid];
  const currentDay = daysOfWeek[new Date().getDay()];
  const currentHour = new Date().getHours();

  const openRoles = accessRoles.filter((r) => {
    // Can this role open the door today?
    if (r.daysOfWeek !== "anytime" && !r.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Can this role open the door at this hour of the day?
    if (r.timeRange === "anytime") {
      return true;
    }

    if (
      r.hourRange &&
      currentHour >= r.hourRange[0] &&
      currentHour <= r.hourRange[1]
    ) {
      return true;
    }
    return false;
  });

  console.log(
    ">>> openRoles",
    openRoles.map((r) => r.name),
  );
  if (!userRoles || userRoles.length === 0) {
    console.log(">>> User", userid, "has no roles");
    return false;
  }
  if (openRoles.some((r) => r.memberIds.includes(userid))) {
    return true;
  }
  console.log(
    ">>> User",
    userid,
    "has no access",
    "userRoles",
    userRoles,
    "openRoles",
    openRoles,
  );
  return false;
}

reloadAccessRoles();

async function resetPresentToday() {
  const d = new Date();

  if (d.getHours() !== 0) {
    return;
  }

  const today = d.toISOString().split("T")[0].replace(/-/g, "");
  const presentTodayRoleId = process.env.DISCORD_PRESENT_TODAY_ROLE_ID;
  // get list of members of the role
  const members = await getMembers(
    process.env.DISCORD_GUILD_ID,
    presentTodayRoleId,
  );

  console.log(">>> Resetting present today for", members.length, "members");
  for (const member of members) {
    try {
      console.log(
        ">>> Removing role",
        presentTodayRoleId,
        "from",
        member.user.username,
      );
      await removeRole(
        process.env.DISCORD_GUILD_ID,
        presentTodayRoleId,
        member.user.id,
      );
    } catch (error) {
      console.error("Failed to remove role:", error);
    }
  }

  if (presentToday[today]?.length > 0) {
    presentToday[today].length = 0;
  }
}

setInterval(
  () => {
    resetPresentToday();
    reloadAccessRoles();
  },
  1000 * 60 * 60 * 1,
); // reset present today every hour

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Pick a random fact from the array based on the score
function pickRandomFact() {
  // The higher the score, the more likely the fact is to be picked
  const totalScore = funFacts.reduce((a, b) => a + b.score, 0);
  const random = Math.random() * totalScore;
  let cumulativeScore = 0;
  for (const fact of funFacts) {
    cumulativeScore += fact.score;
    if (random <= cumulativeScore) {
      return fact.content;
    }
  }
  return funFacts[funFacts.length - 1].content;
}

async function loadFunFacts() {
  console.log(
    ">>> Loading fun facts from channel",
    process.env.DISCORD_FUNFACTS_CHANNEL_ID,
  );
  try {
    const channel = await client.channels.fetch(
      process.env.DISCORD_FUNFACTS_CHANNEL_ID,
    );
    if (!channel?.isTextBased()) return;

    funFacts.length = 0;

    const messages = await channel.messages.fetch({ limit: 100 });
    funFacts.push(
      ...messages
        .filter((m) => m.type === 0)
        .map((m) => {
          const reactionsCount =
            1 +
            m.reactions.cache.map((r) => r.count).reduce((a, b) => a + b, 0);
          // Define a score based on the reactions count and the date of the message
          const daysSinceCreation = Math.ceil(
            (new Date().getTime() - new Date(m.createdTimestamp).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const score = reactionsCount / daysSinceCreation;

          return {
            content: m.content,
            date: m.createdTimestamp,
            daysSinceCreation,
            score,
          };
        }),
    );
    console.log(">>> ", funFacts.length, "fun facts loaded");
  } catch (error) {
    console.error("Failed to load fun facts:", error.rawError.message);
  }
}

setInterval(
  () => {
    loadFunFacts();
  },
  1000 * 60 * 60 * 24,
); // refresh fun facts every 24 hours

function pickRandomReply(user) {
  const randomFact = pickRandomFact();

  console.log(">>> Random fact", randomFact);

  return `**Fun fact**: ${randomFact}`;
}

// Initialize the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

async function loginToDiscord() {
  const data = await rest.get(Routes.gatewayBot());
  if (data.session_start_limit.remaining > 100) {
    // Log in to Discord
    console.log(">>> Logging in to Discord");
    console.log(
      ">>> Remaining connections:",
      data.session_start_limit.remaining,
    );
    client.login(token);
  } else {
    console.log(
      ">>> Remaining connections:",
      data.session_start_limit.remaining,
    );
    console.log(
      ">>> Reset in",
      Math.ceil(Number(data.session_start_limit.reset_after) / 1000 / 60),
      "minutes",
    );
    setTimeout(
      () => {
        loginToDiscord();
      },
      Math.max(1000 * 60, Number(data.session_start_limit.reset_after)),
    ); // retry in 5 minutes
  }
}

loginToDiscord();

// Add this function to register the commands
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("open")
      .setDescription("Opens the door")
      .toJSON(),
  ];

  try {
    console.log("Registering commands...");
    console.log("Bot Client ID:", client.user.id); // Debug log

    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// When the bot is ready
client.once("ready", async () => {
  console.log(`${client.user.tag} is now online!`);
  // Wait a moment before registering commands
  await registerCommands();
  await loadGuild();
  await loadFunFacts();
});

async function handleMessage(message) {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if message is in the allowed channel
  if (message.channelId !== allowedChannelId) return;

  // Now you can handle the message
  console.log(`Received message: ${message.content}`);

  // Example: respond to specific messages
  if (message.content.toLowerCase().trim() === "open") {
    // console.log(JSON.stringify(message.author, null, 2));
    try {
      const roles = userIdToRoles[message.author.id];
      if (!roles) {
        if (DRY_RUN) {
          console.log(
            ">>> DRY RUN: ",
            "No roles found for user",
            message.author.id,
          );
          console.log(">>> DEBUG userIdToRoles", userIdToRoles);
          return;
        }
        message.reply(
          "You don't have access to the Commons Hub Brussels. Become a member to access the door.",
        );
        return;
      }
      const firstRole = accessRoles.find((r) => r.roleId === roles[0]);
      if (hasAccess(message.author.id)) {
        await addUser(message.author, message.guildId);

        logDoorAccess(message.author.displayName, "discord", {
          userId: message.author.id,
          username: message.author.username,
          role: firstRole.name,
        });

        openDoor(message.author.id, client.user.tag);

        const currentHour = new Date().getHours() + 2;
        const isEarlyBird = currentHour < 9;
        const isMorning = currentHour >= 9 && currentHour < 12;
        const isAfternoon = currentHour >= 12 && currentHour < 18;
        const isEvening = currentHour >= 18;

        let greeting = "";

        if (isEarlyBird) {
          greeting = `Good morning early bird! 🐣`;
        } else if (isMorning) {
          greeting = `Good morning ${message.author.displayName}! ☀️`;
        } else if (isAfternoon) {
          greeting = `Good afternoon ${message.author.displayName}! 🌞`;
        } else if (isEvening) {
          greeting = `Good evening ${message.author.displayName}! 🌙`;
        }

        const reply = `${greeting} (${firstRole.description})`;

        if (DRY_RUN) {
          console.log(">>> DRY RUN: ", reply);
          return;
        }
        message.reply(`${reply} \n${pickRandomReply(message.author)}`);
      } else {
        const role = accessRoles.find((r) => r.roleId === roles[0]);
        if (!role) {
          message.reply(
            "You don't have access to the Commons Hub Brussels. Become a member to access the door.",
          );
        } else {
          message.reply(`No access at this time. ${role.description}.`);
        }
        return;
      }
    } catch (error) {
      if (DRY_RUN) {
        console.log(">>> DRY RUN: ", error);
        return;
      }
      message.reply(error.message);
    }
  }
}

client.on("messageCreate", handleMessage);

let isDoorOpen = false;

let status_log = {};
const doorlog = [];

async function addUser(user, guildId) {
  users[user.id] = {
    displayName: user?.globalName || user?.displayName || user?.tag,
    username: user.username,
    tag: user.tag,
    avatar:
      typeof user.avatarURL === "function" ? user.avatarURL() : user.avatarURL,
  };

  const presentTodayRoleId = process.env.DISCORD_PRESENT_TODAY_ROLE_ID;
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  presentToday[today] = presentToday[today] || [];
  if (presentTodayRoleId && guildId) {
    if (guild) {
      const member = guild.members.cache.get(user.id);
      if (member) {
        try {
          console.log(
            ">>> Adding ",
            member.displayName,
            "to",
            presentTodayRoleId,
          );
          await member.roles.add(presentTodayRoleId);
          presentToday[today].push(member);
        } catch (error) {
          console.error("Failed to add role:", error);
        }
      } else {
        throw new Error(
          `User ${user.username} (id: ${user.id}) not found in guild`,
        );
      }
    }
  }
}

function openDoor(userid, agent) {
  console.log("Opening door for userid", userid, "with agent", agent);
  isDoorOpen = true;
  doorlog.push({
    timestamp: new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Brussels",
    }),
    userid,
    agent,
  });

  // Set a timer to reset `isDoorOpen` after 3.5 seconds
  setTimeout(() => {
    isDoorOpen = false;
    console.log("Closing door");
  }, 3500);
}

setInterval(
  () => {
    if (new Date().getHours() === 0) {
      status_log = {};
      console.log(">>> Resetting status log");
    }
  },
  1000 * 60 * 60,
); // reset log every 24h

function getTokenOfTheDay() {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const hash = crypto
    .createHash("md5")
    .update([process.env.DISCORD_GUILD_ID, today, SECRET].join(":"))
    .digest("hex");
  return hash;
}

/**
 * Verify signature for event organiser access
 * @param {Object} params - Query parameters from URL
 * @returns {Object} { valid: boolean, error: string, publicKey: string }
 */
function verifyEventOrganizerSignature(params) {
  const {
    name,
    host,
    reason,
    timestamp,
    startTime,
    duration,
    sig,
    secret,
    eventUrl,
  } = params;

  // Check all required parameters are present
  if (
    !name ||
    !host ||
    !reason ||
    !timestamp ||
    !startTime ||
    !duration ||
    !sig
  ) {
    return { valid: false, error: "Missing required parameters" };
  }

  // If SECRET is set and matches, bypass time checks but still verify signature
  const secretBypass = SECRET && secret === SECRET;

  if (!secretBypass) {
    // Verify current time is within validity window
    const eventStartTime = parseInt(startTime); // in seconds
    const eventDuration = parseInt(duration); // in minutes
    const eventEndTime = eventStartTime + eventDuration * 60;

    const now = new Date().getTime() / 1000;
    if (now < eventStartTime - 30 * 60) {
      // 30 minutes before start
      return { valid: false, error: "Event has not started yet" };
    }

    if (now > eventEndTime + 30 * 60) {
      // 30 minutes after end
      return { valid: false, error: "Event access period has expired" };
    }
  }

  // Construct the message that was signed (include eventUrl if present)
  const message = eventUrl
    ? `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}&eventUrl=${eventUrl}`
    : `name=${name}&host=${host}&reason=${reason}&timestamp=${timestamp}&startTime=${startTime}&duration=${duration}`;

  try {
    // Recover the public key from the signature
    const recoveredAddress = verifyMessage(message, sig);

    // Check if recovered address is in authorized keys whitelist
    const authorizedKey = authorizedKeys.find(
      (key) => key.publicKey.toLowerCase() === recoveredAddress.toLowerCase(),
    );

    if (!authorizedKey) {
      return { valid: false, error: "Unauthorized public key" };
    }

    return {
      valid: true,
      publicKey: recoveredAddress,
      authorizedName: authorizedKey.name,
      secretBypass,
      eventUrl,
    };
  } catch (error) {
    return { valid: false, error: `Invalid signature: ${error.message}` };
  }
}

function getTodayUsers() {
  const today = new Date().toLocaleDateString("en-GB", {
    timeZone: "Europe/Brussels",
  });
  const todayUsers = new Set(); // Use Set to avoid duplicates

  doorlog.forEach((log) => {
    const logDate = log.timestamp.split(",")[0]; // Get date part only
    if (logDate === today) {
      todayUsers.add(log.userid);
    }
  });

  return Array.from(todayUsers);
}

let guild;
async function loadGuild() {
  if (process.env.DISCORD_GUILD_ID) {
    console.log(">>> Loading guild", process.env.DISCORD_GUILD_ID);
    guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    if (!guild) {
      throw new Error(`Guild ${process.env.DISCORD_GUILD_ID} not found`);
    }
    await guild.members.fetch();
  }
}

// Create dependencies object for routes
const dependencies = {
  verifyEventOrganizerSignature,
  loginWithCitizenWallet,
  openDoor,
  logDoorAccess,
  addUser,
  getTokenOfTheDay,
  sendDiscordMessage,
  community,
  users,
  getTodayUsers,
  isDoorOpen: () => isDoorOpen,
  get guild() {
    return guild;
  },
  SECRET,
  doorlog,
  status_log,
};

// Create Express app with all routes
const app = createApp(dependencies);

// Start the server (useful for local development)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
