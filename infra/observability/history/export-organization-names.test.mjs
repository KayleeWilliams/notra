import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("SQL constructor failures never print database credentials or create an export", () => {
  const directory = mkdtempSync(join(tmpdir(), "notra-export-error-"));
  try {
    const output = join(directory, "names.json");
    const result = spawnSync(
      "bun",
      [
        "--no-env-file",
        fileURLToPath(new URL("export-organization-names.ts", import.meta.url)),
        output,
      ],
      {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          DATABASE_URL:
            "postgresql://review_user:synthetic-review-password@[/notra",
        },
      }
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(
      result.stderr.trim(),
      "Organization name export failed; credentials and names suppressed"
    );
    assert.doesNotMatch(result.stderr, /synthetic-review-password|review_user/);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
