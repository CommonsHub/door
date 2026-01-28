/**
 * Express application setup
 * Registers all routes with their dependencies
 */
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Import route handlers
import registerHomeRoute from "./routes/home/index.js";
import registerSuccessRoute from "./routes/success/index.js";
import registerErrorRoute from "./routes/error/index.js";
import registerOpenRoutes from "./routes/open/index.js";
import registerCheckRoute from "./routes/check/index.js";
import registerLogRoute from "./routes/log/index.js";
import registerStatusRoute from "./routes/status/index.js";
import registerTokenRoute from "./routes/token/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp(dependencies) {
  const app = express();

  app.use(express.urlencoded({ extended: true }));

  // Register all routes
  registerHomeRoute(app, dependencies);
  registerSuccessRoute(app, dependencies);
  registerErrorRoute(app, dependencies);
  registerOpenRoutes(app, dependencies);
  registerCheckRoute(app, dependencies);
  registerLogRoute(app, dependencies);
  registerStatusRoute(app, dependencies);
  registerTokenRoute(app, dependencies);

  // Serve static files from 'public' directory
  app.use(express.static(path.join(__dirname, "public")));

  return app;
}
