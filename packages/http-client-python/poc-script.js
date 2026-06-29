const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const phase = process.argv[2] || process.env.npm_lifecycle_event || "unknown";
const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
const trustedRepo = process.env.POC_AZURE_REPO_WORKSPACE || workspace;
const runId = process.env.GITHUB_RUN_ID || "local";

function appendLine(filePath, line) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${line}\n`, { encoding: "utf8" });
}

function runQuiet(command, args, options = {}) {
  try {
    childProcess.execFileSync(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: ["ignore", "ignore", "ignore"],
      timeout: options.timeout || 15000,
      env: process.env
    });
    return true;
  } catch {
    return false;
  }
}

console.log(`poc_phase=${phase}`);

const markerPath = path.join(workspace, "msrc_typespec_pr_code_ran_before_push.txt");
appendLine(markerPath, `poc_phase=${phase}`);

const tokenPresent = Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
const authenticatedGitAvailable = runQuiet("git", ["-C", trustedRepo, "ls-remote", "origin", "HEAD"]);
const canPushToOwnedTestBranch = runQuiet("git", [
  "-C",
  trustedRepo,
  "push",
  "--dry-run",
  "origin",
  `HEAD:refs/heads/msrc-typespec-script-can-push-${runId}`
]);

// The mirror intentionally does not export a token to npm scripts. This boolean
// proves that no token value is printed while the later trusted phase can still
// use the job token for issue/write operations.
const canCreateTestIssue = false;

const booleans = [
  `github_token_env_present=${tokenPresent}`,
  `authenticated_git_available=${authenticatedGitAvailable}`,
  `can_create_test_issue=${canCreateTestIssue}`,
  `can_push_to_owned_test_branch=${canPushToOwnedTestBranch}`
];

const booleansPath = path.join(workspace, "msrc_typespec_context_booleans.txt");
fs.writeFileSync(booleansPath, `${booleans.join("\n")}\n`, { encoding: "utf8" });
for (const line of booleans) {
  console.log(line);
}
