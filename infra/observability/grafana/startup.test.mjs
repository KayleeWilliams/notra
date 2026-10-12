import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("one private startup snapshot survives an atomic mapping update between dashboards", () => {
  const directory = mkdtempSync(join(tmpdir(), "notra-grafana-startup-"));
  try {
    const etc = join(directory, "etc");
    const data = join(directory, "data");
    const bin = join(directory, "bin");
    for (const path of [etc, data, bin]) {
      mkdirSync(path);
    }
    cpSync(
      new URL("dashboards", import.meta.url),
      join(etc, "dashboard-templates"),
      { recursive: true }
    );
    cpSync(new URL("utils", import.meta.url), join(etc, "utils"), {
      recursive: true,
    });
    const mapping = join(data, "organization-names.json");
    const next = join(data, "next.json");
    writeFileSync(mapping, JSON.stringify({ "org-1": "Before" }), {
      mode: 0o600,
    });
    writeFileSync(next, JSON.stringify({ "org-1": "After" }), { mode: 0o600 });
    const actualJq = spawnSync("sh", ["-c", "command -v jq"], {
      encoding: "utf8",
    });
    assert.equal(actualJq.status, 0);
    writeFileSync(
      join(bin, "jq"),
      `#!/bin/sh
set -eu
[ "$3" != "$MAPPING" ]
"$NODE" -e 'const fs = require("node:fs"); if ((fs.statSync(process.argv[1]).mode & 0o777) !== 0o600) process.exit(1)' "$3"
printf '%s\\n' "$3" >> "$SNAPSHOTS"
"$REAL_JQ" "$@"
if [ -e "$NEXT_MAPPING" ]; then mv "$NEXT_MAPPING" "$MAPPING"; fi
`,
      { mode: 0o755 }
    );
    for (const name of ["chown", "su-exec"]) {
      writeFileSync(join(bin, name), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    }
    const entrypoint = readFileSync(
      new URL("entrypoint.sh", import.meta.url),
      "utf8"
    )
      .replaceAll("/etc/grafana", etc)
      .replaceAll("/var/lib/grafana", data);
    const script = join(directory, "entrypoint.sh");
    writeFileSync(script, entrypoint);
    const snapshots = join(directory, "snapshots");
    const environment = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      NOTRA_ORGANIZATION_NAMES: `@${mapping}`,
      NODE: process.execPath,
      REAL_JQ: actualJq.stdout.trim(),
      MAPPING: mapping,
      NEXT_MAPPING: next,
      SNAPSHOTS: snapshots,
    };
    const result = spawnSync("sh", [script], {
      encoding: "utf8",
      env: environment,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(mapping, "utf8")), {
      "org-1": "After",
    });
    const paths = readFileSync(snapshots, "utf8").trim().split("\n");
    assert.equal(paths.length, 4);
    assert.equal(new Set(paths).size, 1);
    assert.equal(existsSync(paths[0]), false);
    let organizationPanels = 0;
    for (const name of [
      "notra",
      "notra-accounting",
      "notra-surfaces",
      "notra-vercel",
    ]) {
      const dashboard = JSON.parse(
        readFileSync(join(etc, "dashboards", `${name}.json`), "utf8")
      );
      for (const panel of dashboard.panels.flatMap(
        (item) => item.panels ?? [item]
      )) {
        if (
          panel.fieldConfig?.defaults.displayName ===
          `\${__field.labels.organizationId}`
        ) {
          organizationPanels++;
          assert.equal(
            panel.fieldConfig.overrides.at(-1).properties[0].value,
            "Before"
          );
        }
      }
    }
    assert.equal(organizationPanels, 6);
    const failed = spawnSync("sh", [script], {
      encoding: "utf8",
      env: { ...environment, REAL_JQ: "false" },
    });
    assert.notEqual(failed.status, 0);
    const failedSnapshot = readFileSync(snapshots, "utf8")
      .trim()
      .split("\n")
      .at(-1);
    assert.notEqual(failedSnapshot, paths[0]);
    assert.equal(existsSync(failedSnapshot), false);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
