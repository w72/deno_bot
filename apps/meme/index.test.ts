import App from "./index.ts";
import { BotEvent, testPath } from "bot";
import { join } from "std/path/mod.ts";

Deno.test("meme view image list", async () => {
  const app = new App("meme", {});
  await app.init();
  await app.onViewList({
    reply: (v: Uint8Array) =>
      Deno.writeFile(join(testPath, "meme-list.png"), v),
  } as BotEvent);
});

Deno.test("meme generate image", async () => {
  const app = new App("meme", {});
  await app.init();
  await app.onGenerate({
    match: ["", "未来", "既见未来 为何不拜"],
    reply: async (v: Uint8Array | string) => {
      if (typeof v === "string") {
        console.log(v);
      } else {
        await Deno.writeFile(join(testPath, "meme-generate.png"), v);
      }
    },
  } as BotEvent);
});
