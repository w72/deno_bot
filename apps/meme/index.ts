import { BotApp, BotEvent, name, listen, filter } from "/core.ts";
import CanvasKit, { FontMgr } from "canvas";
import * as ImageScript from "image_script";

import { drawList, drawMeme } from "./draw.ts";

interface State {
  fontMgr: FontMgr;
}
export default class App extends BotApp<State> {
  name = "表情生成";

  async init() {
    const assetFontYh = this.asset("../font/msyh.ttc");
    const assetFontPcr = this.asset("../font/TTQinYuanJ-W3.ttf");
    const fontYh = await Deno.readFile(assetFontYh);
    const fontPcr = await Deno.readFile(assetFontPcr);
    const fontMgr = CanvasKit.FontMgr.FromData(fontPcr, fontYh)!;
    this.state.fontMgr = fontMgr;
  }

  @name("上传表情")
  @listen("message")
  @filter(/^上传表情\s+([^\s+]+)\s*$/, { image: true })
  async onUpdateLoad(e: BotEvent) {
    const name = e.match[1];
    if (name.length > 7) {
      return e.reply(`表情名称过长`);
    }
    if (!e.image) return;
    const imgBuffer = await fetch(e.image.url).then((r) => r.arrayBuffer());
    const img = await ImageScript.decode(new Uint8Array(imgBuffer));
    const imgPNG = await img
      .resize(160, ImageScript.Image.RESIZE_AUTO)
      ?.encode();
    if (!imgPNG) throw new Error();
    await Deno.writeFile(this.asset(`${name}.png`), imgPNG);
    return e.reply(`上传表情“${name}”成功`);
  }

  @name("查看表情列表")
  @listen("message")
  @filter(/^查看表情$/)
  async onViewList(e: BotEvent) {
    const { fontMgr } = this.state;
    const buf = await drawList({ fontMgr, getAsset: this.asset });
    return e.reply(buf);
  }

  @name("查看单个表情")
  @listen("message")
  @filter(/^查看表情\s+([^\s+]+)$/)
  async onViewSingle(e: BotEvent) {
    const name = e.match[1];
    try {
      const img = await Deno.readFile(this.asset(`${name}.png`));
      return e.reply(img);
    } catch {
      return e.reply(`未找到名为“${name}”的表情`);
    }
  }

  @name("生成表情")
  @listen("message")
  @filter(/^生成表情\s+([^\s+]+)\s+(.+?)\s*$/s)
  async onGenerate(e: BotEvent) {
    const { fontMgr } = this.state;
    const [, name, text] = e.match;
    const res = await drawMeme({ name, text, fontMgr, getAsset: this.asset });
    await e.reply(res);
  }

  @name("删除表情")
  @listen("message")
  @filter(/^删除表情\s+([^\s+]+)$/)
  async onDelete(e: BotEvent) {
    const name = e.match[1];
    const imgPath = this.asset(`${name}.png`);
    try {
      await Deno.remove(imgPath);
      return e.reply(`删除表情“${name}”成功`);
    } catch {
      return e.reply(`未找到名为“${name}”的表情`);
    }
  }
}
