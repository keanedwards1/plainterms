#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const mode = args[0];
const build = args.includes("--build");
const envFlag = args.indexOf("--env");
// "default" is the production stack; "staging" is the separate test stack.
const configEnv = envFlag >= 0 ? args[envFlag + 1] : "default";

if (!mode || !["live", "sandbox"].includes(mode)) {
  console.error("Usage: node scripts/deploy-stripe-mode.mjs <live|sandbox> [--build] [--env staging]");
  process.exit(1);
}

if (!["default", "staging"].includes(configEnv)) {
  console.error(`Unknown --env "${configEnv}". Use "staging" or leave it out for production.`);
  process.exit(1);
}

if (configEnv === "staging" && mode !== "sandbox") {
  console.error("The staging stack only runs with Stripe sandbox keys.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const samDir = path.join(repoRoot, "services", "api", "plainterms-api");
const samConfigPath = path.join(samDir, "samconfig.toml");

const configText = readFileSync(samConfigPath, "utf8");
// Read parameter_overrides from this environment's [<env>.deploy.parameters] section.
const sectionStart = configText.indexOf(`[${configEnv}.deploy.parameters]`);
const sectionText = sectionStart >= 0 ? configText.slice(sectionStart).split(/\n(?=\[)/)[0] : "";
const match = sectionText.match(/^parameter_overrides\s*=\s*"(.*)"\s*$/m);
if (!match) {
  console.error(`Could not find parameter_overrides in ${samConfigPath}`);
  process.exit(1);
}

let parameterOverrides = match[1].replace(/\\"/g, '"').trim();
if (/StripeMode="(?:live|sandbox)"/.test(parameterOverrides)) {
  parameterOverrides = parameterOverrides.replace(
    /StripeMode="(?:live|sandbox)"/,
    `StripeMode="${mode}"`
  );
} else {
  parameterOverrides = `StripeMode="${mode}" ${parameterOverrides}`.trim();
}

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: samDir,
    env: {
      ...process.env,
      npm_config_cache: process.env.npm_config_cache ?? "/tmp/npmcache",
      NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE ?? "/tmp/npmcache",
    },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

const envArgs = ["--config-env", configEnv];

if (build) {
  run("sam", ["build", ...envArgs]);
}

console.log(
  `Deploying PlainTerms API (${configEnv === "staging" ? "staging stack" : "production stack"}) with StripeMode=${mode}`
);
run("sam", ["deploy", ...envArgs, "--parameter-overrides", parameterOverrides]);
