import App from "./index.ts";
import { BotEvent } from "/core.ts";

Deno.test("test pcr-luck image generate", async () => {
  const app = new App("pcr-lucky", {});
  await app.init();
  await app.onGroupMessage({
    reply: (v: Uint8Array) => Deno.writeFile("test.png", v),
  } as BotEvent);
});
