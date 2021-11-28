import App from "./index.ts";
import { BotEvent, rootPath } from "/core.ts";
import { join } from "std/path/mod.ts";

Deno.test("test pcr-luck image generate", async () => {
  const app = new App("pcr-lucky", {});
  await app.init();
  await app.onGroupMessage({
    reply: (v: Uint8Array) =>
      Deno.writeFile(join(rootPath, "tests", "pcr-lucky.png"), v),
  } as BotEvent);
});
