import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const SECRET = process.env.SECRET || "";
console.log("SECRET length", SECRET.length);
const userid = process.argv[2];
console.log("Getting token for userid", userid);

const hash = crypto
  .createHash("md5")
  .update([process.env.DISCORD_GUILD_ID, userid, SECRET].join(":"))
  .digest("hex");

console.log("Token", hash);
process.exit(0);
