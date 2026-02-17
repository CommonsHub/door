/**
 * Status route - GET /status
 * Returns status of connected door hardware clients
 */
export default function registerStatusRoute(app, dependencies) {
  const { status_log } = dependencies;

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
          },
        );
        const elapsed = new Date() - new Date(lastLog.timestamp);
        if (elapsed > 4000) {
          status[ip] = `Offline since ${lastTimestamp} (${Math.round(
            elapsed / 1000,
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
}
