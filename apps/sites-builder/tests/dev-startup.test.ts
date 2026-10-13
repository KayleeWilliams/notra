import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { findFreePort } from "../compiler/dev-server";

test("interrupting startup cleans its session and tolerates repeated signals", async () => {
  const toolchain = fileURLToPath(new URL("..", import.meta.url));
  const root = await mkdtemp(join(tmpdir(), "notra-dev-startup-test-"));
  const source = join(root, "source");
  const temp = join(root, "temp");
  await mkdir(join(source, "blog"), { recursive: true });
  await mkdir(temp);
  await writeFile(
    join(source, "blog", "hello.mdx"),
    '---\ntitle: "Hello"\ndate: 2026-10-12\n---\n\nHello startup.\n'
  );
  const port = await findFreePort(19500);
  const child = Bun.spawn(
    [
      process.execPath,
      join(toolchain, "compiler", "cli.ts"),
      "dev",
      "--source",
      source,
      "--port",
      String(port),
    ],
    { env: { ...process.env, TMPDIR: temp }, stdout: "pipe", stderr: "pipe" }
  );
  const output = Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  try {
    const deadline = Date.now() + 10_000;
    let connected = false;
    while (Date.now() < deadline) {
      const listening = await new Promise<boolean>((resolve) => {
        const socket = connect(port, "127.0.0.1");
        socket.once("connect", () => {
          socket.destroy();
          resolve(true);
        });
        socket.once("error", () => resolve(false));
      });
      if (listening) {
        connected = true;
        break;
      }
      await Bun.sleep(10);
    }
    expect(connected).toBe(true);
    child.kill("SIGINT");
    await Bun.sleep(2);
    if (child.exitCode === null) {
      child.kill("SIGTERM");
    }
    expect(
      await Promise.race([child.exited, Bun.sleep(10_000).then(() => -1)])
    ).toBe(0);
    await output;
    expect(
      (await readdir(temp)).filter((name) =>
        name.startsWith("notra-sites-dev-")
      )
    ).toEqual([]);
    expect(
      await fetch(`http://127.0.0.1:${port}`, {
        signal: AbortSignal.timeout(500),
      }).catch(() => null)
    ).toBeNull();
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await child.exited;
    }
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
