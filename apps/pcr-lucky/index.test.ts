import App from "./index.ts";
import { BotEvent, testPath } from "bot";
import { join } from "std/path/mod.ts";

Deno.test("pcr-luck image generate", async () => {
  const app = new App("pcr-lucky", {});
  await app.init();
  await app.onGroupMessage({
    reply: (v: Uint8Array) =>
      Deno.writeFile(join(testPath, "pcr-lucky.png"), v),
  } as BotEvent);
});
