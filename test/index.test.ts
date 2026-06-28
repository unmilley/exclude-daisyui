import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cliPath = join(process.cwd(), "dist", "cli.mjs");

function runCli(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: cwd || process.cwd(),
    encoding: "utf8",
  });
}

describe("exclude-daisyui CLI", () => {
  it("prints help and exits with code 1", () => {
    const result = runCli(["-h"]);
    expect(result.stdout).toContain("Usage: exclude-daisyui");
  });

  it("prints full DaisyUI class list", () => {
    const result = runCli(["-l"]);

    expect(result.stdout).toContain("DaisyUI classes:");
    expect(result.stdout).toContain("alert");
    expect(result.stdout).toContain("button");
  });

  it("returns only used classes with --include", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "exclude-daisyui-"));
    writeFileSync(
      join(tempDir, "App.vue"),
      '<div class="alert badge"></div>',
      "utf8",
    );

    const result = runCli(["-i", tempDir]);
    rmSync(tempDir, { recursive: true, force: true });

    expect(result.stdout).toContain("include:");
    expect(result.stdout).toContain("alert");
    expect(result.stdout).toContain("badge");
    expect(result.stdout).not.toContain("button");
  });

  it("returns unused classes with default exclude mode", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "exclude-daisyui-"));
    writeFileSync(
      join(tempDir, "index.html"),
      '<button class="alert"></button>',
      "utf8",
    );

    const result = runCli([tempDir]);
    rmSync(tempDir, { recursive: true, force: true });

    expect(result.stdout).toContain("exclude:");
    expect(result.stdout).not.toContain("alert");
  });
});
