import App from "./index.ts";
import { BotEvent, rootPath } from "bot";
import { join } from "std/path/mod.ts";

Deno.test("test pcr-gacha gacha1 image generate", async () => {
  const app = new App("pcr-gacha", {});
  await app.init();
  await app.onGacha({
    cmd: "单抽",
    reply: async (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      const path = join(rootPath, "tests", "pcr-gacha1.png");
      await Deno.writeFile(path, v);
    },
  } as BotEvent);
});

Deno.test("test pcr-gacha gacha10 image generate", async () => {
  const app = new App("pcr-gacha", {});
  await app.init();
  await app.onGacha({
    cmd: "十连",
    reply: async (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      const path = join(rootPath, "tests", "pcr-gacha10.png");
      await Deno.writeFile(path, v);
    },
  } as BotEvent);
});

Deno.test("test pcr-gacha gacha300 image generate", async () => {
  const app = new App("pcr-gacha", {
    get_group_member_info(param: unknown) {
      console.log(param);
      return Promise.resolve({ card: "测试用户" });
    },
  });
  await app.init();
  await app.onGacha({
    cmd: "抽一井",
    data: {
      group_id: 123,
      user_id: 12345,
    },
    reply: async (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      const path = join(rootPath, "tests", "pcr-gacha300.png");
      await Deno.writeFile(path, v);
    },
  } as BotEvent);
});
