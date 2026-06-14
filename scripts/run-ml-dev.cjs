const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function resolvePythonCommand(
  repoRoot,
  exists = fs.existsSync,
  platform = process.platform,
) {
  const candidates =
    platform === "win32"
      ? [
          path.join(repoRoot, "apps", "ml", ".venv-win", "Scripts", "python.exe"),
          path.join(repoRoot, "apps", "ml", ".venv", "Scripts", "python.exe"),
          "py",
          "python",
        ]
      : [
          path.join(repoRoot, "apps", "ml", ".venv", "bin", "python"),
          "python",
        ];

  return candidates.find(
    (candidate) => candidate === "py" || candidate === "python" || exists(candidate),
  );
}

function buildUvicornArgs(withReload = false) {
  const args = ["-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"];

  if (withReload) {
    args.push("--reload");
  }

  return args;
}

function checkPythonModuleAvailable(pythonCommand, moduleName, cwd) {
  return new Promise((resolve) => {
    const child = spawn(pythonCommand, ["-c", `import ${moduleName}`], {
      cwd,
      stdio: "ignore",
      shell: false,
    });

    child.on("exit", (code) => {
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}

function run() {
  const repoRoot = path.resolve(__dirname, "..");
  const mlDir = path.join(repoRoot, "apps", "ml");
  const pythonCommand = resolvePythonCommand(repoRoot);
  const args = buildUvicornArgs(process.argv.includes("--reload"));

  Promise.resolve()
    .then(async () => {
      const uvicornAvailable = await checkPythonModuleAvailable(pythonCommand, "uvicorn", mlDir);
      if (!uvicornAvailable) {
        console.warn(
          `Skipping ML dev server because "${pythonCommand} -m uvicorn" is unavailable in ${mlDir}. Install apps/ml requirements to enable it.`,
        );
        process.exit(0);
        return;
      }

      const child = spawn(pythonCommand, args, {
        cwd: mlDir,
        stdio: "inherit",
        shell: false,
      });

      child.on("exit", (code, signal) => {
        if (signal) {
          process.kill(process.pid, signal);
          return;
        }

        process.exit(code ?? 0);
      });

      child.on("error", (error) => {
        console.error(
          `Failed to start ML service with "${pythonCommand}". Ensure Python and apps/ml dependencies are installed.`,
        );
        console.error(error);
        process.exit(1);
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

if (require.main === module) {
  run();
}

module.exports = {
  buildUvicornArgs,
  resolvePythonCommand,
};
