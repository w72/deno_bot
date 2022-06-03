import App from "./index.ts";
import { BotEvent, testPath } from "bot";
import { join } from "std/path/mod.ts";

Deno.test("moyu", async () => {
  const app = new App("moyu", {});
  await app.onMoyu({
    async reply(msg) {
      if (typeof msg === "string") {
        console.log(msg);
      } else if (msg instanceof Uint8Array) {
        await Deno.writeFile(join(testPath, "moyu.png"), msg);
      }
    },
  } as BotEvent);
});
