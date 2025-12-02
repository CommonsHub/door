/**
 * Token route - GET /token
 * Returns today's access token (requires SECRET)
 */
export default function registerTokenRoute(app, dependencies) {
  const { getTokenOfTheDay, SECRET } = dependencies;

  app.get("/token", (req, res) => {
    if (req.query.secret !== SECRET) {
      return res.status(403).send("Invalid secret");
    }
    res.status(200).send(getTokenOfTheDay());
  });
}
