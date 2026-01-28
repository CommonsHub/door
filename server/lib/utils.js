import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loadJSON = (filePath) => {
  // Resolve relative to the server directory (parent of lib/)
  const serverDir = path.join(__dirname, "..");
  filePath = path.join(serverDir, filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};
