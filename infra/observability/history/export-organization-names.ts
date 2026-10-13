import { writeFile } from "node:fs/promises";

import { SQL } from "bun";

import { organizationNames } from "./schemas/organization-names.ts";
import type { OrganizationNameRow } from "./types/history.ts";

if (!process.env.DATABASE_URL || !process.argv[2]) {
  throw new Error("DATABASE_URL and an output file path are required");
}

try {
  const sql = new SQL(process.env.DATABASE_URL, {
    max: 1,
    connectionTimeout: 5,
    idleTimeout: 1,
  });
  try {
    const rows = await sql.begin("READ ONLY", async (tx) => {
      await tx`SET LOCAL statement_timeout = '5s'`;
      await tx`SET LOCAL lock_timeout = '1s'`;
      return tx<
        OrganizationNameRow[]
      >`SELECT id, name FROM organizations ORDER BY id LIMIT 10001`;
    });
    const names = organizationNames(rows);
    await writeFile(process.argv[2], JSON.stringify(names), {
      mode: 0o600,
      flag: "wx",
    });
    console.log(
      `Exported ${rows.length} organization names to the protected output file`
    );
  } finally {
    await sql.close();
  }
} catch {
  console.error(
    "Organization name export failed; credentials and names suppressed"
  );
  process.exitCode = 1;
}
