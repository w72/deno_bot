import { BotApp, BotEvent, name, filter, listen } from "/core.ts";
import { createCanvas, loadImage } from "canvas";
import { sampleOne } from "deno_dash/collection/sampleOne.ts";
import { join, basename } from "std/path/mod.ts";

interface Desc {
  charaid: string[];
  type: {
    "good-luck": number;
    content: string;
  }[];
}

interface State {
  luckType: { "good-luck": number; name: string }[];
  luckDesc: Desc[];
  luckDescGenshin: Desc[];
  bases: string[];
  basesGenshin: string[];
}

export default class App extends BotApp {
  state = {} as State;

  init() {
    const assetFontMamelon = this.asset("font/Mamelon.otf");
    const assetFontSakura = this.asset("font/sakura.ttf");
    const assetLuckType = this.asset("data/luck_type.json");
    const assetLuckDesc = this.asset("data/luck_desc.json");
    const assetLuckDescGenshin = this.asset("data/luck_desc_genshin.json");
    const assetImgBase = this.asset("imgbase");
    const assetImgBaseGenshin = this.asset("imgbase-genshin");

    const fontMamelon = Deno.readFileSync(assetFontMamelon);
    const fontSakura = Deno.readFileSync(assetFontSakura);
    const luckType = Deno.readTextFileSync(assetLuckType);
    const luckDesc = Deno.readTextFileSync(assetLuckDesc);
    const luckDescGenshin = Deno.readTextFileSync(assetLuckDescGenshin);
    const imgBase = Deno.readDirSync(assetImgBase);
    const imgBaseGenshin = Deno.readDirSync(assetImgBaseGenshin);

    const canvas = createCanvas(1, 1);
    canvas.loadFont(fontMamelon, { family: "mamelon" });
    canvas.loadFont(fontSakura, { family: "sakura" });

    this.state.luckType = JSON.parse(luckType);
    this.state.luckDesc = JSON.parse(luckDesc);
    this.state.luckDescGenshin = JSON.parse(luckDescGenshin);
    this.state.bases = Array.from(imgBase).map((v) => join("imgbase", v.name));
    this.state.basesGenshin = Array.from(imgBaseGenshin).map((v) =>
      join("imgbase-genshin", v.name)
    );
  }

  @name("抽签")
  @listen("message.group")
  @filter(/^抽签$/, { at: true })
  async onGroupMessage(e: BotEvent) {
    const {
      luckType,
      bases: basesPcr,
      luckDesc: luckDescPcr,
      basesGenshin,
      luckDescGenshin,
    } = this.state;
    const [bases, luckDesc] =
      Math.random() < 0.5
        ? [basesPcr, luckDescPcr]
        : [basesGenshin, luckDescGenshin];
    const assetPath = sampleOne(bases);
    const charId = basename(assetPath).slice(6, -4);
    const char = luckDesc.find((v) => v.charaid.includes(charId))!;
    const charType = sampleOne(char.type);
    const luck = luckType.find(
      (v) => v["good-luck"] === charType["good-luck"]
    )!;
    const { name: title } = luck;
    let { content: text } = charType;
    if (text.length > 9 && text.length < 9 * 2) {
      const diff = 9 * 2 - text.length;
      const middle = Math.ceil(text.length / 2);
      text = text.slice(0, middle) + " ".repeat(diff) + text.slice(middle);
    }
    const lines: string[] = text.match(/(.{1,9})/g)!;

    const canvas = createCanvas(480, 480);
    const ctx = canvas.getContext("2d");

    const imgBase = await loadImage(this.asset(assetPath));
    ctx.drawImage(imgBase, 0, 0);

    ctx.save();
    ctx.font = "45px mamelon";
    ctx.fillStyle = "#F5F5F5";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 140, 99);
    ctx.restore();

    ctx.save();
    ctx.font = "25px sakura";
    ctx.fillStyle = "#323232";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const [i, line] of lines.entries()) {
      const lineX = 125 + 15 * lines.length - i * 30;
      for (const [j, letter] of Array.from(line).entries()) {
        ctx.fillText(
          letter,
          lineX,
          200 + ((9 - line.length) / 2) * 28 + 28 * j
        );
      }
    }
    ctx.restore();

    await e.reply(canvas.toBuffer());
  }
}
