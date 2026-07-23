const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../..");
const rootPackage = require("../../package.json");

test("the repository declares its supported toolchain", () => {
  assert.equal(rootPackage.engines.node, "^22.13.0");
  assert.equal(rootPackage.engines.npm, ">=10.9.0 <12");
  assert.equal(rootPackage.packageManager, "npm@11.6.0");
});

test("the Quartz package ships the complete repository license", () => {
  const rootLicense = fs.readFileSync(path.join(rootDir, "LICENSE"), "utf8");
  const quartzLicense = fs.readFileSync(
    path.join(rootDir, "packages", "quartz", "LICENSE"),
    "utf8",
  );

  assert.equal(quartzLicense, rootLicense);
});
