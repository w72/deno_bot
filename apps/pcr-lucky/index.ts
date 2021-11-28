import { BotApp, BotEvent, name, filter, listen } from "/core.ts";
import CanvasKit, { Typeface, loadImage, FontMgr } from "canvas";
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
  fontMgr: FontMgr;
  fontSakura: Typeface;
}

export default class App extends BotApp {
  state = {} as State;

  async init() {
    const assetFontMamelon = this.asset("font/Mamelon.otf");
    const assetFontSakura = this.asset("font/sakura.ttf");
    const assetLuckType = this.asset("data/luck_type.json");
    const assetLuckDesc = this.asset("data/luck_desc.json");
    const assetLuckDescGenshin = this.asset("data/luck_desc_genshin.json");
    const assetImgBase = this.asset("imgbase");
    const assetImgBaseGenshin = this.asset("imgbase-genshin");

    const fontMamelon = await Deno.readFile(assetFontMamelon);
    const fontSakura = await Deno.readFile(assetFontSakura);
    const luckType = await Deno.readTextFile(assetLuckType);
    const luckDesc = await Deno.readTextFile(assetLuckDesc);
    const luckDescGenshin = await Deno.readTextFile(assetLuckDescGenshin);
    const imgBase = [];
    for await (const v of Deno.readDir(assetImgBase))
      imgBase.push(join("imgbase", v.name));
    const imgBaseGenshin = [];
    for await (const v of Deno.readDir(assetImgBaseGenshin))
      imgBaseGenshin.push(join("imgbase-genshin", v.name));

    const fontMgr = CanvasKit.FontMgr.FromData(fontMamelon)!;

    this.state.fontMgr = fontMgr;
    this.state.fontSakura = (fontMgr as any).MakeTypefaceFromData(fontSakura);
    this.state.luckType = JSON.parse(luckType);
    this.state.luckDesc = JSON.parse(luckDesc);
    this.state.luckDescGenshin = JSON.parse(luckDescGenshin);
    this.state.bases = imgBase;
    this.state.basesGenshin = imgBaseGenshin;
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
      fontMgr,
      fontSakura,
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

    const surface = CanvasKit.MakeSurface(480, 480)!;
    const canvas = surface.getCanvas();

    const imgBase = await loadImage(this.asset(assetPath));
    canvas.drawImage(imgBase, 0, 0, new CanvasKit.Paint());

    const paraStyle = new CanvasKit.ParagraphStyle({
      textStyle: {
        color: CanvasKit.Color(245, 245, 245),
        fontFamilies: ["Mamelon"],
        heightMultiplier: 1.2,
        fontSize: 45,
      },
      textAlign: CanvasKit.TextAlign.Center,
    });
    const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.addText(title);
    const paragraph = builder.build();
    paragraph.layout(160);
    canvas.drawParagraph(paragraph, 60, 76);

    const font = new CanvasKit.Font(fontSakura, 25);
    const fontPaint = new CanvasKit.Paint();
    for (const [i, line] of lines.entries()) {
      const lineX = 114 + 15 * lines.length - i * 30;
      for (const [j, letter] of Array.from(line).entries()) {
        const letterY = 195 + ((9 - line.length) / 2) * 28 + 28 * j;
        canvas.drawText(letter, lineX, letterY, fontPaint, font);
      }
    }

    const snapshot = surface.makeImageSnapshot();
    const buf = snapshot.encodeToBytes()!;
    snapshot.delete();

    await e.reply(buf);
  }
}
