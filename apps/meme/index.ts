import { BotApp, BotEvent, name, listen, filter } from "/core.ts";
import CanvasKit, { loadImage, FontMgr } from "canvas";
import * as ImageScript from "image_script";

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
    const imgIns = await ImageScript.decode(new Uint8Array(imgBuffer));
    const imgPNG = await imgIns
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

    const imgList: string[] = [];
    for await (const v of Deno.readDir(this.assetPath)) imgList.push(v.name);

    const surfaceWidth = imgList.length < 5 ? imgList.length * 160 : 5 * 160;
    const surfaceHeight = Math.ceil(imgList.length / 5) * 160;

    const surface = CanvasKit.MakeSurface(surfaceWidth, surfaceHeight)!;
    const canvas = surface.getCanvas();
    canvas.clear(CanvasKit.WHITE);

    const textStyle = new CanvasKit.TextStyle({
      color: CanvasKit.Color(0x3c, 0x40, 0x4c),
      fontFamilies: ["pcr", "Microsoft YaHei"],
      heightMultiplier: 1.2,
      fontSize: 20,
    });

    const paraStyle = new CanvasKit.ParagraphStyle({
      textStyle,
      textAlign: CanvasKit.TextAlign.Center,
    });

    const fgPaint = new CanvasKit.Paint();
    fgPaint.setColor(CanvasKit.WHITE);
    fgPaint.setStyle(CanvasKit.PaintStyle.Stroke);
    fgPaint.setStrokeWidth(2);

    const bgPaint = new CanvasKit.Paint();
    bgPaint.setColor(CanvasKit.TRANSPARENT);

    const imgPaint = new CanvasKit.Paint();

    for (const [i, imgPath] of imgList.entries()) {
      const img = await loadImage(this.asset(imgPath));
      const x = (i % 5) * 160;
      const y = Math.floor(i / 5) * 160;
      const name = imgPath.slice(0, -4);
      canvas.drawImageRect(
        img,
        [0, 0, img.width(), img.height()],
        [x, y, x + 160, y + (160 * img.height()) / img.width()],
        imgPaint
      );

      const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
      builder.pushPaintStyle(textStyle, fgPaint, bgPaint);
      builder.addText(name);
      const paragraph = builder.build();
      paragraph.layout(160);
      canvas.drawParagraph(paragraph, x, y);

      const builder0 = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
      builder0.addText(name);
      const paragraph0 = builder0.build();
      paragraph0.layout(160);
      canvas.drawParagraph(paragraph0, x, y);
    }

    const snapshot = surface.makeImageSnapshot();
    const buf = snapshot.encodeToBytes()!;
    snapshot.delete();

    await e.reply(buf);
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
    let img;
    try {
      img = await loadImage(this.asset(`${name}.png`));
    } catch {
      return e.reply(`未找到名为“${name}”的表情`);
    }
    const lines = text.split(" ").filter(Boolean);
    const maxLineWidth = Math.max(...lines.map((v) => v.length));
    if (maxLineWidth > 8) return e.reply("每行最多八个字");
    const fontSize = maxLineWidth > 6 ? 18 : 24;
    const lineHeight = Math.ceil(fontSize * 1.2);
    const imgWidth = 160;
    const imgHeight = (imgWidth / img.width()) * img.height();
    const surfaceHeight = imgHeight + lineHeight * lines.length;

    const surface = CanvasKit.MakeSurface(imgWidth, surfaceHeight)!;
    const canvas = surface.getCanvas();
    canvas.clear(CanvasKit.WHITE);

    canvas.drawImageRect(
      img,
      [0, 0, img.width(), img.height()],
      [0, 0, imgWidth, imgHeight],
      new CanvasKit.Paint()
    );

    const paraStyle = new CanvasKit.ParagraphStyle({
      textStyle: {
        color: CanvasKit.Color(0x3c, 0x40, 0x4c),
        fontFamilies: ["pcr", "Microsoft YaHei"],
        heightMultiplier: 1.2,
        fontSize,
      },
      textAlign: CanvasKit.TextAlign.Center,
    });
    const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.addText(lines.join("\n"));
    const paragraph = builder.build();
    paragraph.layout(160);
    canvas.drawParagraph(paragraph, 0, imgHeight);

    const snapshot = surface.makeImageSnapshot();
    const buf = snapshot.encodeToBytes()!;
    snapshot.delete();

    await e.reply(buf);
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
