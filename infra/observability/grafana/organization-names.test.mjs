import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("organization display overrides preserve IDs, costs, links and unknown customers", () => {
  for (const name of [
    "notra",
    "notra-accounting",
    "notra-surfaces",
    "notra-vercel",
  ]) {
    const path = fileURLToPath(
      new URL(`dashboards/${name}.json`, import.meta.url)
    );
    const original = JSON.parse(readFileSync(path, "utf8"));
    const result = spawnSync(
      "jq",
      [
        "-f",
        fileURLToPath(new URL("utils/organization-names.jq", import.meta.url)),
        path,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          NOTRA_ORGANIZATION_NAMES: JSON.stringify({
            "org-1": "Acme & Sons",
            "org-2": "",
            "org-3": "  ",
          }),
        },
      }
    );
    assert.equal(result.status, 0, result.stderr);
    const named = JSON.parse(result.stdout);
    const panels = named.panels.flatMap((panel) => panel.panels ?? [panel]);
    for (const panel of panels) {
      if (
        panel.fieldConfig?.defaults.displayName ===
        `\${__field.labels.organizationId}`
      ) {
        assert.deepEqual(panel.fieldConfig.overrides.at(-1), {
          matcher: { id: "byName", options: "org-1" },
          properties: [{ id: "displayName", value: "Acme & Sons" }],
        });
        panel.fieldConfig.overrides.pop();
        if (panel.fieldConfig.overrides.length === 0) {
          const source = original.panels
            .flatMap((item) => item.panels ?? [item])
            .find(({ id }) => id === panel.id);
          if (!source.fieldConfig.overrides) {
            delete panel.fieldConfig.overrides;
          }
        }
      }
    }
    assert.deepEqual(named, original);
    const empty = spawnSync(
      "jq",
      [
        "-f",
        fileURLToPath(new URL("utils/organization-names.jq", import.meta.url)),
        path,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, NOTRA_ORGANIZATION_NAMES: "{}" },
      }
    );
    assert.equal(empty.status, 0, empty.stderr);
    assert.deepEqual(JSON.parse(empty.stdout), original);
  }
});

test("organization name mapping rejects invalid configuration without printing its content", () => {
  for (const mapping of [
    '{"private-name":',
    "[]",
    '{"org-1":42}',
    `{"org-1":"\${__field.name}"}`,
    '{"org-1":"bad\\nname"}',
  ]) {
    const result = spawnSync(
      "jq",
      [
        "-f",
        fileURLToPath(new URL("utils/organization-names.jq", import.meta.url)),
        fileURLToPath(new URL("dashboards/notra.json", import.meta.url)),
      ],
      {
        encoding: "utf8",
        env: { ...process.env, NOTRA_ORGANIZATION_NAMES: mapping },
      }
    );
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.doesNotMatch(result.stderr, /private-name/);
  }
});

test("private file mappings bypass environment-variable limits and retain exact organization IDs", () => {
  const directory = mkdtempSync(join(tmpdir(), "notra-org-names-"));
  try {
    const file = join(directory, "names.json");
    writeFileSync(file, JSON.stringify({ "org-1": "Acme & Sons" }), {
      mode: 0o600,
    });
    const result = spawnSync(
      "jq",
      [
        "--slurpfile",
        "organizationNames",
        file,
        "-f",
        fileURLToPath(new URL("utils/organization-names.jq", import.meta.url)),
        fileURLToPath(new URL("dashboards/notra.json", import.meta.url)),
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          NOTRA_ORGANIZATION_NAMES: "@/var/lib/grafana/organization-names.json",
        },
      }
    );
    assert.equal(result.status, 0, result.stderr);
    const panel = JSON.parse(result.stdout).panels.find(({ id }) => id === 108);
    assert.deepEqual(panel.fieldConfig.overrides.at(-1), {
      matcher: { id: "byName", options: "org-1" },
      properties: [{ id: "displayName", value: "Acme & Sons" }],
    });
  } finally {
    rmSync(directory, { recursive: true });
  }
});
