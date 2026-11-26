// Entry point for hosts that start a Node app through Passenger (cPanel "Setup Node.js App").
// Set "Application startup file" to server.js. Run `npm run build` once per deploy before the app starts.
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => console.log(`Tracker ready on ${port}`));
});
