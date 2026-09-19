// Runs the API, the user site and the admin panel together (dev mode). No dependencies: `node start.js`.
// Each app must have been installed first (`npm install` inside spotify-backend, spotify-frontend, spotify-admin).
const { spawn } = require("child_process");
const path = require("path");

const apps = [
  { name: "api  ", dir: "spotify-backend" },
  { name: "web  ", dir: "spotify-frontend" },
  { name: "admin", dir: "spotify-admin" },
];

const children = apps.map(({ name, dir }) => {
  const child = spawn("npm", ["run", "dev"], {
    cwd: path.join(__dirname, dir),
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
  });

  const prefix = (stream, out) =>
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) out.write(`[${name}] ${line}\n`);
      }
    });
  prefix(child.stdout, process.stdout);
  prefix(child.stderr, process.stderr);

  child.on("close", (code) => {
    if (code) console.error(`[${name}] exited with code ${code}`);
  });
  return child;
});

const stopAll = () => children.forEach((child) => child.kill());
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
