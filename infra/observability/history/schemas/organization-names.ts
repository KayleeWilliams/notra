import type { OrganizationNameRow } from "../types/history.ts";

export function organizationNames(rows: OrganizationNameRow[]) {
  if (
    rows.length > 10000 ||
    rows.some(
      (row) =>
        !row.id ||
        [...row.id].length > 256 ||
        [...row.name].length > 256 ||
        row.name.includes(`\${`) ||
        [...row.name].some((character) => {
          const point = character.charCodeAt(0);
          return point <= 31 || (point >= 127 && point <= 159);
        })
    )
  ) {
    throw new Error("Invalid organization name mapping");
  }
  return Object.fromEntries(rows.map((row) => [row.id, row.name]));
}
