// Passenger entry for cPanel "Setup Node.js App" (Application startup file: app.js).
// Loads ./.env (secrets live only on the server), then starts the Next.js standalone server.
const path = require("node:path");
const fs = require("node:fs");

// Shells export the machine name as HOSTNAME; the standalone server would bind to it. Keep the default.
if (!fs.existsSync(path.join(__dirname, ".env")) || !/^HOSTNAME=/m.test(fs.readFileSync(path.join(__dirname, ".env"), "utf8"))) {
  delete process.env.HOSTNAME;
}
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch (e) {
  console.error("[app] could not read .env:", e.message);
}

require("./server.js");
