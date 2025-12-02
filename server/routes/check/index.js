/**
 * Check route - GET /check
 * Returns door status (open/closed) for physical door hardware
 */
export default function registerCheckRoute(app, dependencies) {
  const { isDoorOpen, status_log } = dependencies;

  app.get("/check", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    status_log[ip] = status_log[ip] || [];
    status_log[ip].push({
      timestamp: new Date().toISOString(),
      ip,
      userAgent: req.headers["user-agent"],
      isDoorOpen: isDoorOpen(),
    });

    if (isDoorOpen()) {
      res.status(200).send("open");
    } else {
      res.status(403).send("closed"); // Forbidden if door is closed
    }
  });
}
