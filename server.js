/**
 * Startup file for cPanel ("Setup Node.js App") and other Passenger hosts.
 * ------------------------------------------------------------------
 * cPanel runs Node.js apps through Phusion Passenger, which needs a
 * JavaScript "Application startup file" instead of the `next start`
 * command. This file starts the already-built Next.js app (run
 * `npm run build` first) and listens on the port Passenger gives it.
 *
 * Elsewhere you can keep using `npm start` – both do the same thing.
 * Locally:  npm run build && node server.js   → http://localhost:3000
 */
const { createServer } = require("node:http");
const next = require("next");

// Passenger / the host sets PORT; 3000 is only the local fallback
const port = parseInt(process.env.PORT || "3000", 10);

// Always serve the production build (also reads .env from this folder)
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> RangeDoc ready on port ${port}`);
  });
});
