import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const TSX = path.join(ROOT, "node_modules", ".bin", "tsx");
const CLI = path.join(ROOT, "src", "cli.ts");

function runInit(cwd: string): string {
  // A clean env, so only the project's .env can supply keys.
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, NO_COLOR: "1" };
  return execFileSync(TSX, [CLI, "init"], { cwd, env, encoding: "utf8" });
}

function readEnv(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(dir, ".env"), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

describe("jevcache init", () => {
  let dir = "";
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("keeps keys, port and upstream already in .env", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jevcache-init-"));
    fs.writeFileSync(
      path.join(dir, ".env"),
      "OPENAI_API_KEY=sk-existing\nUPSTREAM_BASE_URL=https://api.openai.com/v1\nPORT=8090\nAPP_SECRET=keep-me\n",
    );
    runInit(dir);
    const env = readEnv(dir);
    expect(env.OPENAI_API_KEY).toBe("sk-existing");
    expect(env.UPSTREAM_BASE_URL).toBe("https://api.openai.com/v1");
    expect(env.PORT).toBe("8090");
    expect(env.OPENAI_BASE_URL).toBe("http://127.0.0.1:8090/v1");
    expect(env.APP_SECRET).toBe("keep-me");
  });

  it("writes defaults into a project without .env", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jevcache-init-"));
    runInit(dir);
    const env = readEnv(dir);
    expect(env.OPENAI_BASE_URL).toBe("http://127.0.0.1:8080/v1");
    expect(env.UPSTREAM_BASE_URL).toBe("https://openrouter.ai/api/v1");
    expect(env.DATA_DIR).toBe("./data");
  });
});
