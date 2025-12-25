const { spawn } = require("child_process");

function runCommand(command, args, cwd) {
  const process = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });

  process.on("close", (code) => {
    if (code !== 0) {
      console.error(`Process in ${cwd} exited with code ${code}`);
    }
  });
}

// Run commands
runCommand("npm", ["run", "dev"], "spotify-admin");
runCommand("npm", ["run", "start"], "spotify-backend");
runCommand("npm", ["run", "dev"], "spotify-frontend");
