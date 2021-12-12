import App from "./index.ts";
import { BotEvent, rootPath } from "/core.ts";
import { join } from "std/path/mod.ts";

Deno.test("test pcr-gacha gacha1 image generate", async () => {
  const app = new App("pcr-gacha", {});
  await app.init();
  await app.onGacha({
    cmd: "单抽",
    reply: (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      Deno.writeFile(join(rootPath, "tests", "pcr-gacha1.png"), v);
    },
  } as BotEvent);
});

Deno.test("test pcr-gacha gacha10 image generate", async () => {
  const app = new App("pcr-gacha", {});
  await app.init();
  await app.onGacha({
    cmd: "十连",
    reply: (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      Deno.writeFile(join(rootPath, "tests", "pcr-gacha10.png"), v);
    },
  } as BotEvent);
});
