/**
 * Open route - GET /open and POST /open
 * Handles door access via signature, CitizenWallet, token, or shortcut
 */
import crypto from "crypto";
import { generateSignatureSuccessPage } from "./signature-success.html.js";
import { generateSignatureErrorPage } from "./signature-error.html.js";
import { generateCitizenWalletSuccessPage } from "./citizenwallet-success.html.js";
import { generateNoAppPage } from "./citizenwallet-no-app.html.js";
import { generateForbiddenPage } from "./citizenwallet-forbidden.html.js";

export default function registerOpenRoutes(app, dependencies) {
  const {
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
    guild,
    SECRET,
  } = dependencies;

  // GET /open - Main access route
  app.get("/open", async (req, res) => {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // Check for signature-based event organizer access
    if (req.query.sig) {
      const verification = verifyEventOrganizerSignature(req.query);

      if (!verification.valid) {
        console.log(
          ">>> /open Signature verification failed:",
          verification.error,
        );

        const html = generateSignatureErrorPage({
          error: verification.error,
          eventName: req.query.reason,
          eventUrl: req.query.eventUrl,
          startTime: req.query.startTime ? parseInt(req.query.startTime) : null,
          duration: req.query.duration ? parseInt(req.query.duration) : null,
        });

        return res.status(403).send(html);
      }

      // Create a user object for the event organizer
      const user = {
        id: `event_${req.query.host}_${req.query.timestamp}`,
        username: req.query.name,
        tag: req.query.name,
        globalName: req.query.name,
        avatarURL: null,
      };

      await addUser(user);
      openDoor(user.id, `${req.query.host} (${verification.authorizedName})`);

      // Log to append-only file
      logDoorAccess(req.query.name, "signature", {
        host: req.query.host,
        reason: req.query.reason,
        eventUrl: req.query.eventUrl,
        authorizedKey: verification.authorizedName,
        startTime: req.query.startTime,
        duration: req.query.duration,
        secretBypass: verification.secretBypass || false,
      });

      // Send message to Discord channel with link to event (suppress preview)
      const eventLink = req.query.eventUrl
        ? `<${req.query.eventUrl}>`
        : req.query.reason;
      await sendDiscordMessage(
        `🚪 ${req.query.name} opened the door for ${eventLink} hosted by ${req.query.host}`,
      );

      // Generate welcome page with redirect
      const html = generateSignatureSuccessPage({
        name: req.query.name,
        eventName: req.query.reason,
        eventUrl: req.query.eventUrl,
      });

      return res.send(html);
    }

    const { profile, balance } = loginWithCitizenWallet(req.query);

    if (req.query.token) {
      const hash = getTokenOfTheDay();
      if (req.query.token !== hash) {
        console.log(">>> /open Invalid token", req.query.token);
        return res.status(403).send("Invalid token");
      } else {
        logDoorAccess("Token User", "token", { date: today });
        openDoor(today, "token");
        sendDiscordMessage(`🚪 Door opened using today's token`);

        const todayUsers = getTodayUsers();
        return res.send(
          generateCitizenWalletSuccessPage(null, todayUsers, users),
        );
      }
    }

    if (balance > 0) {
      // Create a user object that matches the expected structure
      const user = {
        id: profile.address,
        username: profile?.username || profile.address.slice(0, 8),
        tag: profile?.username || profile.address.slice(0, 8),
        globalName: profile?.username,
        avatarURL: profile?.image_medium || null,
      };

      await addUser(user);

      const username = profile?.username || profile.address.slice(0, 8);
      logDoorAccess(username, "citizenwallet", {
        address: profile.address,
        balance,
      });

      openDoor(profile.address, (profile && profile.username) || "unknown");

      // Send message to Discord channel via REST
      await sendDiscordMessage(
        `🚪 Door opened by ${username} via Citizen Wallet`,
      );

      const todayUsers = getTodayUsers();
      return res.send(
        generateCitizenWalletSuccessPage(profile, todayUsers, users),
      );
    } else {
      if (req.query.sigAuthAccount) {
        return res.send(generateForbiddenPage(profile));
      } else {
        return res.send(generateNoAppPage(community));
      }
    }
  });

  // POST /open - Shortcut access
  app.post("/open", async (req, res) => {
    const { token, userid } = req.body;

    // Verify token first
    const hash = crypto
      .createHash("md5")
      .update([process.env.DISCORD_GUILD_ID, userid, SECRET].join(":"))
      .digest("hex");
    if (token !== hash) {
      if (req.host === "localhost" && SECRET) {
        console.log(">>> /open Invalid token", token, hash);
      } else {
        console.log(">>> /open Invalid token", token);
      }
      return res.status(403).send("Invalid token");
    }

    // Get member from guild if available
    let member;
    let displayName = userid; // Fallback to userid

    if (guild) {
      member = guild.members.cache.get(userid);
      if (!member) {
        return res.status(403).send("User not found");
      }
      displayName =
        member.user.displayName ||
        member.user.globalName ||
        member.user.username;

      logDoorAccess(displayName, "shortcut", {
        userId: member.id,
        username: member.user.username,
      });

      // Send message to Discord channel via REST
      const msg = `🚪 Door opened by <@${member.id}> via shortcut 📲`;
      await sendDiscordMessage(msg);

      addUser(member.user, process.env.DISCORD_GUILD_ID);
    } else {
      // Guild not loaded, log with userid
      logDoorAccess(userid, "shortcut", {
        userId: userid,
        note: "Guild not loaded",
      });

      await sendDiscordMessage(
        `🚪 Door opened by user <@${userid}> via shortcut 📲`,
      );
    }

    openDoor(userid, displayName);

    const msg = member
      ? `🚪 Door opened by <@${member.id}> via shortcut 📲`
      : `🚪 Door opened via shortcut 📲`;

    return res.status(200).send(msg);
  });
}
