import App from "./index.ts";
import { urls, parseNames } from "./utils.ts";
import { BotEvent, testPath } from "bot";
import { join } from "std/path/mod.ts";
import { assert } from "std/testing/asserts.ts";

Deno.test("pcr-gacha gacha1 image generate", async () => {
  const app = new App("pcr-gacha", {});
  await app.init();
  await app.onGacha({
    cmd: "单抽",
    reply: async (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      const path = join(testPath, "pcr-gacha1.png");
      await Deno.writeFile(path, v);
    },
  } as BotEvent);
});

Deno.test("pcr-gacha gacha10 image generate", async () => {
  const app = new App("pcr-gacha", {});
  await app.init();
  await app.onGacha({
    cmd: "十连",
    reply: async (v: Uint8Array | null) => {
      if (!v) {
        console.log("生成图片失败");
        return;
      }
      const path = join(testPath, "pcr-gacha10.png");
      await Deno.writeFile(path, v);
    },
  } as BotEvent);
});

Deno.test("pcr-gacha gacha300 image generate", async () => {
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
      const path = join(testPath, "pcr-gacha300.png");
      await Deno.writeFile(path, v);
    },
  } as BotEvent);
});

Deno.test("pcr-gacha names parse", async () => {
  const pyFilePath = join(testPath, "names.py");
  let resPyText;
  try {
    resPyText = await Deno.readTextFile(pyFilePath);
  } catch {
    resPyText = await fetch(urls.names).then((r) => r.text());
    await Deno.writeTextFile(pyFilePath, resPyText);
  }
  const names = parseNames(resPyText);
  assert(Object.keys(names).length > 10);
  assert(Object.values(names).every((v) => Array.isArray(v)));
});
