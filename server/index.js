require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const {
  verifyAccountOwnership,
  getAccountBalance,
  getProfileFromAddress,
} = require("./cw/cw");
const express = require("express");
const path = require("path");
const community = require("./cw/community.json");

const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

// Get bot token and allowed channel ID from the environment variables
const token = process.env.DISCORD_BOT_TOKEN;
const allowedChannelId = process.env.DISCORD_CHANNEL_ID;
const users = {};

const presentToday = {};

setInterval(() => {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  Object.keys(presentToday).forEach((day) => {
    if (day !== today) {
      presentToday[day].forEach((member) => {
        try {
          console.log(
            ">>> Removing role",
            process.env.DISCORD_PRESENT_TODAY_ROLE_ID,
            "from",
            member.user.username
          );
          member.roles.remove(process.env.DISCORD_PRESENT_TODAY_ROLE_ID);
        } catch (error) {
          console.error("Failed to remove role:", error);
        }
      });
      presentToday[day].length = 0;
    }
  });
}, 1000 * 60 * 60 * 2);

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

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

  console.log(">>> new Date", new Date(), "currentHour", currentHour, replies);

  const funFactsAboutBrussels = [
    "Hugo the First is the first king of the Commons Hub.",
    "Jana the Great is the first queen of the Commons Hub.",
    "There are 2.5 floors in the Commons Hub.",
    "The Commons Hub is the largest common building in Brussels.",
    "17 languages are spoken in the Commons Hub. Can you list them all?",
    "A belgian university professor has his name in the bitcoin whitepaper published in 2008 (Jean-Jacques Quisquater).",
    "Belgium is not a country, it's a concept.",
    "The Commons Hub building used to be a cookie factory.",
    "Brussels is the capital of Belgium and the capital of Europe. No joke.",
    "There are 48 steps in the Commons Hub (I think, I might be wrong, can you count them?).",
    "The Commons Hub is called La Maison des Communs in French.",
    "If you take a part time job to take care of a sick relative, GDP goes down. If you work full time and pay someone to take care of them, GDP goes up. Don't follow the GDP.",
    "Brussels doesn't care much about who is in power. Through the ages, empires come and go, but Brussels citizens always find a way to self-organise and make it work.",
    "Brussels is managed by political parties whose majority of members do not live in Brussels.",
    "The most common second language in Brussels is English.",
    "The average age of the US congress is 58 years old, compared to 50 years old for the European Parliament. Do you feel represented now?",
    "Belgium was one of the best performing economies during the 2008 financial crisis. Turns out not having a government for 589 days to take austerity measures was a good idea.",
    "The most spoken languages in Brussels are French (88%), English (30%), Dutch (23%), Arabic (18%), Spanish (9%) and German (7%).",
    "There is another Commons Hub in the countryside of Austria. They organise every year a crypto commons event around collaborative finance.",
    "The average person spends 2 years of their life waiting for red lights to turn green.",
    "There is no cloud. It's just somebody else's computer.",
    "The Eiffel Tower can be 15 cm taller during the summer due to the expansion of the iron on hot days. Isn't it ironic? Don't you think?",
    "A single strand of Spaghetti is called a 'Spaghetto'.",
    "You can take a 15mn metro from Brussels Central to Herrmann Debroux and be in the Sonian Forest in no time. #regenwalk 🌳",
    "Another nice regen walk: take the metro to Stockel then take the green way to Beaulieu. Then metro back to Central Station. #regenwalk 🌳",
    "The total weight of all the ants on Earth is greater than the total weight of all the humans on the planet.",
    "Brussels hosts the world’s largest flower carpet every two years on the Grand Place, made of over 500,000 begonias.",
    "Victor Horta’s Art Nouveau townhouses—like Hôtel Tassel and Hôtel Solvay—pioneered the architectural style in the early 20th century.",
    "The Galeries Royales Saint-Hubert, opened in 1847, is one of Europe’s oldest covered shopping arcades.",
    "Besides Manneken Pis, Brussels has two companion statues: Jeanneke Pis (a girl) and Zinneke Pis (a dog). Do you know where they are?",
    "Brussels-Midi/Zuid station is Belgium’s busiest train station and a major Eurostar hub connecting to London.",
    "The Royal Greenhouses of Laeken, designed by Alphonse Balat, open to the public only a few weeks each spring.",
    "Brussels waffles (light, rectangular) differ from Liège waffles (denser, sugar-studded) and are sold from street carts everywhere.",
    "The Belgian Comic Strip Center, housed in a Victor Horta building, celebrates Belgium’s rich bande dessinée heritage.",
    "The Palace of Justice in Brussels was the largest building constructed in the 19th century, dominating the skyline.",
    "Each spring, the Iris Festival honors Brussels’ official flower (the yellow iris) with free concerts and guided tours.",
    "Brussels is known as Europe’s unofficial Comics Capital, with over 50 comic murals featuring characters like Tintin and The Smurfs.",
    "The Manneken Pis statue has a wardrobe of over 1,000 costumes, gifted by various societies.",
    "Brussels sprouts were first cultivated around Brussels in the 13th century.",
    "The Grand Place (Grote Markt) is famed for its gilded guildhalls and Baroque façades, deemed one of Europe’s most beautiful squares.",
    "Brussels is home to world-renowned chocolatiers such as Neuhaus, Godiva, and Pierre Marcolini.",
    "The Atomium, built for Expo ’58, represents an iron crystal magnified 165 billion times and offers panoramic views from 92 m high.",
    "Brussels is officially bilingual (French and Dutch), but over 100 languages are spoken across the city.",
    "As the de facto capital of the EU, Brussels hosts the European Commission, Parliament, and Council, employing over 40,000 EU staff.",
    "Belgium has over 1,500 beer varieties, and many iconic Lambic and Gueuze brews are produced near Brussels.",
    "Despite its urban character, Brussels boasts more than 8 million trees in parks and boulevards, including Bois de la Cambre and the Royal Park.",
  ];

  return `${pickRandom(replies)} \n**Fun fact**: ${pickRandom(
    funFactsAboutBrussels
  )}`;
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

    const rest = new REST({ version: "10" }).setToken(token);
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

// Add this event listener after your other client.on events
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

// Log in to Discord
client.login(token);
const app = express();

let isDoorOpen = false;
const SECRET = process.env.SECRET || "";
const status_log = {};
const doorlog = [];

async function addUser(user, guildId) {
  users[user.id] = {
    displayName: user?.globalName || user?.displayName || user?.tag,
    username: user.username,
    tag: user.tag,
    avatar:
      typeof user.avatarURL === "function" ? user.avatarURL() : user.avatarURL,
  };

  const role = process.env.DISCORD_PRESENT_TODAY_ROLE_ID;
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  presentToday[today] = presentToday[today] || [];
  if (role && guildId) {
    const guild = await client.guilds.fetch(guildId);

    if (guild) {
      const member = guild.members.cache.get(user.id);
      if (member) {
        try {
          console.log(">>> Adding role", role, "to", user.username);
          await member.roles.add(role);
          presentToday[today].push(member);
        } catch (error) {
          console.error("Failed to add role:", error);
        }
      }
    }
  }
}

function openDoor(userid, agent) {
  const user = users[userid];
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

// Route to open the door if the correct secret is provided
app.get("/open", async (req, res) => {
  const { sigAuthAccount, sigAuthExpiry, sigAuthSignature, sigAuthRedirect } =
    req.query;

  let connectedAccount;
  if (sigAuthAccount && sigAuthExpiry && sigAuthSignature && sigAuthRedirect) {
    try {
      if (new Date().getTime() > new Date(sigAuthExpiry).getTime()) {
        throw new Error("Signature expired");
      }

      const message = `Signature auth for ${sigAuthAccount} with expiry ${sigAuthExpiry} and redirect ${encodeURIComponent(
        sigAuthRedirect
      )}`;

      const isOwner = await verifyAccountOwnership(
        community,
        sigAuthAccount,
        message,
        sigAuthSignature
      );
      if (!isOwner) {
        throw new Error("Invalid signature");
      }
      connectedAccount = sigAuthAccount;
    } catch (e) {
      console.error("Failed to verify signature:", e);
      // You might want to handle this error case appropriately
    }
  }

  if (!connectedAccount) {
    return res.send(generateNoAppHtml());
  }

  const balance = await getAccountBalance(community, connectedAccount);

  const decimals = community.token.decimals;
  const balanceFormatted = Number(balance) / 10 ** decimals;

  const profile = await getProfileFromAddress(community, connectedAccount);

  if (balanceFormatted > 0) {
    // Create a user object that matches the expected structure
    const user = {
      id: connectedAccount,
      username: profile?.username || connectedAccount.slice(0, 8),
      tag: profile?.username || connectedAccount.slice(0, 8),
      globalName: profile?.username,
      avatarURL: profile?.image_medium || null,
    };

    await addUser(user);
    openDoor(connectedAccount, (profile && profile.username) || "unknown");

    // Send message to Discord channel
    const channel = client.channels.cache.get(allowedChannelId);
    if (channel) {
      await channel.send(
        `🚪 Door opened by ${
          profile?.username || connectedAccount.slice(0, 8)
        } via Citizen Wallet`
      );
    }

    return res.send(generateOpenHtml(profile));
  } else {
    return res.send(generateForbiddenHtml(profile));
  }
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
  <h1>Welcome ${profile?.username || "unknown"}!</h1>
  
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
