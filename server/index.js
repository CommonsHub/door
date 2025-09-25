require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const { loginWithCitizenWallet } = require("./lib/citizenwallet");
const { sendDiscordMessage, getMembers, removeRole } = require("./lib/discord");

const express = require("express");
const path = require("path");
const community = require("./lib/citizenwallet/community.json");
const crypto = require("crypto");
const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

// Get bot token and allowed channel ID from the environment variables
const token = process.env.DISCORD_BOT_TOKEN;
const allowedChannelId = process.env.DISCORD_CHANNEL_ID;
const users = {};

const SECRET = process.env.SECRET || "";

const presentToday = {};
const funFacts = [];

const rest = new REST({ version: "10" }).setToken(token);

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
    presentTodayRoleId
  );

  console.log(">>> Resetting present today for", members.length, "members");
  for (const member of members) {
    try {
      console.log(
        ">>> Removing role",
        presentTodayRoleId,
        "from",
        member.user.username
      );
      await removeRole(
        process.env.DISCORD_GUILD_ID,
        presentTodayRoleId,
        member.user.id
      );
    } catch (error) {
      console.error("Failed to remove role:", error);
    }
  }

  if (presentToday[today]?.length > 0) {
    presentToday[today].length = 0;
  }
}

setInterval(() => {
  resetPresentToday();
}, 1000 * 60 * 60 * 1);

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
    process.env.DISCORD_FUNFACTS_CHANNEL_ID
  );
  try {
    const channel = await client.channels.fetch(
      process.env.DISCORD_FUNFACTS_CHANNEL_ID
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
              (1000 * 60 * 60 * 24)
          );
          const score = reactionsCount / daysSinceCreation;

          return {
            content: m.content,
            date: m.createdTimestamp,
            daysSinceCreation,
            score,
          };
        })
    );
    console.log(">>> ", funFacts.length, "fun facts loaded");
  } catch (error) {
    console.error("Failed to load fun facts:", error.rawError.message);
  }
}

setInterval(() => {
  loadFunFacts();
}, 1000 * 60 * 60 * 24); // refresh fun facts every 24 hours

function pickRandomReply(user) {
  const currentHour = new Date().getHours() + 2;
  const isEarlyBird = currentHour < 9;
  const isMorning = currentHour >= 9 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 18;
  const isEvening = currentHour >= 18;

  if (isEarlyBird) {
    replies = ["Good morning early bird! 🐣"];
  } else if (isMorning) {
    replies = ["Good morning! ☀️"];
  } else if (isAfternoon) {
    replies = ["Good afternoon! 🌞"];
  } else if (isEvening) {
    replies = ["Good evening! 🌙"];
  }

  const randomFact = pickRandomFact();

  console.log(">>> Random fact", randomFact);

  return `${pickRandom(replies)} \n**Fun fact**: ${randomFact}`;
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
      data.session_start_limit.remaining
    );
    client.login(token);
  } else {
    console.log(
      ">>> Remaining connections:",
      data.session_start_limit.remaining
    );
    console.log(
      ">>> Reset in",
      Math.ceil(Number(data.session_start_limit.reset_after) / 1000 / 60),
      "minutes"
    );
    setTimeout(() => {
      loginToDiscord();
    }, Math.max(1000 * 60, Number(data.session_start_limit.reset_after))); // retry in 5 minutes
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

// Handle interactions (like slash commands)
client.on("interactionCreate", async (interaction) => {
  // Check if the interaction is a command and if it comes from the allowed channel
  if (!interaction.isCommand()) return;

  try {
    // Only respond if the interaction is in the allowed channel
    if (interaction.channelId !== allowedChannelId) {
      return interaction.reply({
        content: "This bot can only be used in a specific channel!",
        ephemeral: true,
      });
    }

    const { commandName } = interaction;

    if (commandName === "open") {
      await interaction.reply(pickRandomReply(interaction.user));
      await addUser(interaction.user, interaction.guildId);
      openDoor(interaction.user.id, client.user.tag);
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    // Try to respond to the user if we haven't already
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "There was an error processing your command!",
          ephemeral: true,
        })
        .catch(console.error);
    }
  }
});

client.on("messageCreate", async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if message is in the allowed channel
  if (message.channelId !== allowedChannelId) return;

  // Now you can handle the message
  console.log(`Received message: ${message.content}`);

  // Example: respond to specific messages
  if (message.content.toLowerCase().trim() === "open") {
    // console.log(JSON.stringify(message.author, null, 2));
    await addUser(message.author, message.guildId);
    openDoor(message.author.id, client.user.tag);
    message.reply(pickRandomReply(message.author));
  }
});

const app = express();
app.use(express.urlencoded({ extended: true }));

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
            presentTodayRoleId
          );
          await member.roles.add(presentTodayRoleId);
          presentToday[today].push(member);
        } catch (error) {
          console.error("Failed to add role:", error);
        }
      } else {
        throw new Error(
          `User ${user.username} (id: ${user.id}) not found in guild`
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

setInterval(() => {
  if (new Date().getHours() === 0) {
    status_log = {};
    console.log(">>> Resetting status log");
  }
}, 1000 * 60 * 60); // reset log every 24h

getTokenOfTheDay = () => {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const hash = crypto
    .createHash("md5")
    .update([process.env.DISCORD_GUILD_ID, today, SECRET].join(":"))
    .digest("hex");
  return hash;
};

app.get("/token", (req, res) => {
  if (req.query.secret !== SECRET) {
    return res.status(403).send("Invalid secret");
  }
  res.status(200).send(getTokenOfTheDay());
});

// Route to open the door if the correct secret is provided
app.get("/open", async (req, res) => {
  const { profile, balance } = loginWithCitizenWallet(req.query);

  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");

  if (req.query.token) {
    const hash = getTokenOfTheDay();
    if (req.query.token !== hash) {
      console.log(">>> /open Invalid token", req.query.token);
      return res.status(403).send("Invalid token");
    } else {
      openDoor(today, "token");
      sendDiscordMessage(`🚪 Door opened by using today's token`);
      return res.send(generateOpenHtml());
    }
  }

  if (balance > 0) {
    // Create a user object that matches the expected structure
    const user = {
      id: profile.address,
      username: profile?.username || connectedAccount.slice(0, 8),
      tag: profile?.username || connectedAccount.slice(0, 8),
      globalName: profile?.username,
      avatarURL: profile?.image_medium || null,
    };

    await addUser(user);
    openDoor(connectedAccount, (profile && profile.username) || "unknown");

    // Send message to Discord channel via REST
    await sendDiscordMessage(
      `🚪 Door opened by ${
        profile?.username || connectedAccount.slice(0, 8)
      } via Citizen Wallet`
    );

    return res.send(generateOpenHtml(profile));
  } else {
    if (req.query.sigAuthAccount) {
      return res.send(generateForbiddenHtml(profile));
    } else {
      return res.send(generateNoAppHtml());
    }
  }
});

let guild;
const loadGuild = async function () {
  if (process.env.DISCORD_GUILD_ID) {
    console.log(">>> Loading guild", process.env.DISCORD_GUILD_ID);
    guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    if (!guild) {
      throw new Error(`Guild ${process.env.DISCORD_GUILD_ID} not found`);
    }
    await guild.members.fetch();
  }
};

app.post("/open", async (req, res) => {
  const { token, userid } = req.body;

  let member;
  if (guild) {
    member = guild.members.cache.get(userid);
    if (!member) {
      return res.status(403).send("User not found");
    }
  }

  // Verify token, should be md5 of userid and SECRET
  const hash = crypto
    .createHash("md5")
    .update([process.env.DISCORD_GUILD_ID, userid, SECRET].join(":"))
    .digest("hex");
  if (token !== hash) {
    console.log(">>> /open Invalid token", token);
    return res.status(403).send("Invalid token");
  }

  // Send message to Discord channel via REST
  const msg = `🚪 Door opened by <@${member.id}> via shortcut 📲`;
  await sendDiscordMessage(msg);

  addUser(member, process.env.DISCORD_GUILD_ID);
  openDoor(userid, member?.username);

  return res.status(200).send(msg);
});

// Route to check if the door is open
app.get("/check", (req, res) => {
  // console.log(JSON.stringify(req.connection, null, 2));
  // console.log(req);
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  status_log[ip] = status_log[ip] || [];
  status_log[ip].push({
    timestamp: new Date().toISOString(),
    ip,
    userAgent: req.headers["user-agent"],
    isDoorOpen,
  });
  if (isDoorOpen) {
    res.status(200).send("open");
  } else {
    res.status(403).send("closed"); // Forbidden if door is closed
  }
});

app.get("/log", (req, res) => {
  res
    .status(200)
    .header("Content-Type", "application/json")
    .send(JSON.stringify(doorlog, null, 2));
  return;
});

const getTodayUsers = () => {
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
};

const avatarGrid = () => {
  const todayUsers = getTodayUsers();

  if (todayUsers.length === 0) {
    return "<p>No visitors today</p>";
  }

  const avatars = todayUsers
    .map((userid) => {
      const user = users[userid];
      const defaultAvatar =
        "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

      return `
      <div class="today-user">
        <img class="today-avatar" src="${
          user?.avatar || defaultAvatar
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
};

const logRow = (log) => {
  const user = users[log.userid];
  const defaultAvatar =
    "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

  return `
    <div class="log-entry">
      <img class="avatar" src="${user?.avatar || defaultAvatar}" alt="Avatar">
      <div class="log-content">
        <div class="username">${
          user?.displayName || user?.tag || "Unknown User"
        }</div>
        <div class="timestamp">${log.timestamp}</div>
      </div>
    </div>
  `;
};
function generateHtml(doorlog) {
  const body = `
  <img src="/commonshub-icon.svg" class="logo" />
  ${avatarGrid()}
  <h2>Door Access Log</h2>
  ${
    doorlog.length > 0
      ? doorlog.slice(-10).reverse().map(logRow).join("\n")
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

function generateOpenHtml(profile) {
  const body = `
  <img src="${
    profile?.image_medium || DEFAULT_AVATAR
  }" alt="Avatar" class="avatar" style="height: 100px; width: 100px; border-radius: 50%;">
  <h1>Welcome ${profile?.username || "visitor"}!</h1>
  
  <h2>Door opened</h2>
  ${avatarGrid()}
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

function generateNoAppHtml() {
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

function generateForbiddenHtml(profile) {
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

app.get("/", (req, res) => {
  res
    .status(200)
    .header("content-type", "text/html")
    .send(generateHtml(doorlog));
});

app.get("/status", (req, res) => {
  const clients = Object.keys(status_log);
  const status = {};
  clients.forEach((ip) => {
    if (status_log[ip].length === 0) {
      status[ip] = "Online";
    } else {
      const lastLog = status_log[ip][status_log[ip].length - 1];
      const lastTimestamp = new Date(lastLog.timestamp).toLocaleString(
        "en-GB",
        {
          timeZone: "Europe/Brussels",
        }
      );
      const elapsed = new Date() - new Date(lastLog.timestamp);
      if (elapsed > 3500) {
        status[ip] = `Offline since ${lastTimestamp} (${Math.round(
          elapsed / 1000
        )}s ago)`;
      } else {
        status[ip] = `${lastLog.userAgent} online`;
      }
    }
  });
  res
    .status(200)
    .header("Content-Type", "application/json")
    .send(JSON.stringify(status, null, 2));
});

// Serve static files from a 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Start the server (useful for local development)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
