import App from "./index.ts";
import { BotEvent, rootPath } from "/core.ts";
import { join } from "std/path/mod.ts";

Deno.test("test meme view image list", async () => {
  const app = new App("meme", {});
  await app.init();
  await app.onViewList({
    reply: (v: Uint8Array) =>
      Deno.writeFile(join(rootPath, "tests", "meme-list.png"), v),
  } as BotEvent);
});

Deno.test("test meme generate image", async () => {
  const app = new App("meme", {});
  await app.init();
  await app.onGenerate({
    match: ["", "未来", "既见未来 为何不拜"],
    reply: async (v: Uint8Array | string) => {
      if (typeof v === "string") {
        console.log(v);
      } else {
        await Deno.writeFile(join(rootPath, "tests", "meme-generate.png"), v);
      }
    },
  } as BotEvent);
});
