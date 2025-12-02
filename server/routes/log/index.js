/**
 * Log route - GET /log
 * Returns door access log as JSON
 */
export default function registerLogRoute(app, dependencies) {
  const { doorlog } = dependencies;

  app.get("/log", (req, res) => {
    res
      .status(200)
      .header("Content-Type", "application/json")
      .send(JSON.stringify(doorlog, null, 2));
  });
}
