const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildUvicornArgs,
  resolvePythonCommand,
} = require("./run-ml-dev.cjs");

test("resolvePythonCommand prefers Windows venv python when present", () => {
  const windowsPython = path.join(
    "D:\\",
    "Fyp",
    "Merlin",
    "apps",
    "ml",
    ".venv-win",
    "Scripts",
    "python.exe",
  );
  const legacyWindowsPython = path.join(
    "D:\\",
    "Fyp",
    "Merlin",
    "apps",
    "ml",
    ".venv",
    "Scripts",
    "python.exe",
  );
  const fallback = "python";

  const result = resolvePythonCommand("D:\\Fyp\\Merlin", (candidate) =>
    candidate === windowsPython || candidate === legacyWindowsPython,
    "win32",
  );

  assert.equal(result, windowsPython);
  assert.notEqual(result, fallback);
});

test("resolvePythonCommand falls back to py launcher on Windows", () => {
  const result = resolvePythonCommand("D:\\Fyp\\Merlin", () => false, "win32");

  assert.equal(result, "py");
});

test("resolvePythonCommand falls back to POSIX venv python on non-Windows", () => {
  const posixPython = path.join(
    "/workspace",
    "apps",
    "ml",
    ".venv",
    "bin",
    "python",
  );

  const result = resolvePythonCommand("/workspace", (candidate) =>
    candidate === posixPython,
    "linux",
  );

  assert.equal(result, posixPython);
});

test("resolvePythonCommand uses plain python when no venv interpreter exists", () => {
  const result = resolvePythonCommand("/workspace", () => false, "linux");

  assert.equal(result, "python");
});

test("buildUvicornArgs includes app target host port and reload flag", () => {
  assert.deepEqual(buildUvicornArgs(true), [
    "-m",
    "uvicorn",
    "app:app",
    "--host",
    "0.0.0.0",
    "--port",
    "8000",
    "--reload",
  ]);
});
