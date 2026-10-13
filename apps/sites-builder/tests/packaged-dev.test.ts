import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { findFreePort } from "../compiler/dev-server";

test("the installed package hot-reloads content and config outside node_modules", async () => {
  const toolchain = fileURLToPath(new URL("..", import.meta.url));
  const root = await mkdtemp(join(tmpdir(), "notra-packaged-dev-test-"));
  let output = "";
  let child: ReturnType<typeof Bun.spawn> | undefined;
  try {
    const packed = Bun.spawnSync([process.execPath, "run", "package:cli"], {
      cwd: toolchain,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(packed.exitCode).toBe(0);
    const pkg = JSON.parse(
      await readFile(join(toolchain, "package.json"), "utf8")
    );
    const archive = join(root, "runtime.tgz");
    await cp(
      join(toolchain, ".notra", `usenotra-sites-dev-${pkg.version}.tgz`),
      archive
    );
    const source = join(root, "customer site");
    await mkdir(join(source, "blog"), { recursive: true });
    const post = join(source, "blog", "hello.mdx");
    await writeFile(
      post,
      '---\ntitle: "Original post"\ndate: 2026-10-12\n---\n\nOriginal content.\n'
    );
    const port = await findFreePort(19000);
    child = Bun.spawn(
      [
        process.execPath,
        "x",
        "--bun",
        "--package",
        archive,
        "notra-sites",
        "dev",
        "--source",
        source,
        "--port",
        String(port),
      ],
      { stdout: "pipe", stderr: "pipe" }
    );
    const drain = async (stream: ReadableStream<Uint8Array>) => {
      for await (const chunk of stream) {
        output += new TextDecoder().decode(chunk);
      }
    };
    const drained = Promise.all([
      drain(child.stdout as ReadableStream<Uint8Array>),
      drain(child.stderr as ReadableStream<Uint8Array>),
    ]);
    const waitForPage = async (text: string, slug = "hello") => {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const response = await fetch(`http://127.0.0.1:${port}/blog/${slug}`, {
          signal: AbortSignal.timeout(2000),
        }).catch(() => null);
        if (response?.ok && (await response.text()).includes(text)) {
          return;
        }
        await Bun.sleep(200);
      }
      throw new Error(`Preview never rendered ${text}:\n${output}`);
    };
    await waitForPage("Original content.");
    const markdown = await fetch(`http://127.0.0.1:${port}/blog/hello.md`);
    expect(markdown.status).toBe(200);
    expect(markdown.headers.get("content-type")).toContain("text/markdown");
    expect(await markdown.text()).toContain("# Original post");
    await writeFile(
      post,
      '---\ntitle: "Updated post"\ndate: 2026-10-12\n---\n\nUpdated content.\n'
    );
    await waitForPage("Updated content.");
    expect(
      await (await fetch(`http://127.0.0.1:${port}/blog/hello.md`)).text()
    ).toContain("Updated content.");
    await writeFile(
      join(source, "blog.json"),
      JSON.stringify({ name: "Updated site name" })
    );
    await waitForPage("Updated site name");
    await mkdir(join(source, "snippets"));
    await writeFile(
      join(source, "snippets", "counter.jsx"),
      "export const Counter = () => { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>Counter: {count}</button>; };"
    );
    await writeFile(
      join(source, "blog", "counter.mdx"),
      '---\ntitle: "Interactive component"\ndate: 2026-10-12\n---\n\nimport { Counter } from "/snippets/counter.jsx";\n\n<Counter />\n'
    );
    await waitForPage("Counter:", "counter");
    child.kill("SIGINT");
    expect(
      await Promise.race([child.exited, Bun.sleep(10_000).then(() => -1)])
    ).toBe(0);
    await drained;
    expect(
      await fetch(`http://127.0.0.1:${port}/blog/hello`).catch(() => null)
    ).toBeNull();
  } finally {
    if (child?.exitCode === null) {
      child.kill("SIGTERM");
      await child.exited;
    }
    await rm(root, { recursive: true, force: true });
  }
}, 90_000);
