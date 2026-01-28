/**
 * Home route - GET /
 * Displays door access log and today's visitors
 */
import { generateHomePage } from "./home.html.js";

export default function registerHomeRoute(app, dependencies) {
  const { doorlog, getTodayUsers, users } = dependencies;

  app.get("/", (req, res) => {
    const todayUsers = getTodayUsers();
    res
      .status(200)
      .header("content-type", "text/html")
      .send(generateHomePage(doorlog, todayUsers, users));
  });
}
