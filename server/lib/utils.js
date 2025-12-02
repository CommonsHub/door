import fs from "fs";
import path from "path";
export const loadJSON = (filePath) => {
  filePath = path.join(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};
