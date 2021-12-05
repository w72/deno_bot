import { fontMgr } from "/core.ts";
import CanvasKit, { loadImage } from "canvas";

export async function drawList(params: {
  getAsset: (name: string) => string;
}): Promise<Uint8Array> {
  const { getAsset } = params;
  const imgList: string[] = [];
  for await (const v of Deno.readDir(getAsset("."))) imgList.push(v.name);

  const cellSize = 160;
  const lineCount = Math.ceil(imgList.length / 5);
  const surfaceWidth = 5 * cellSize;
  const surfaceHeight = lineCount * cellSize;

  const surface = CanvasKit.MakeSurface(surfaceWidth, surfaceHeight)!;
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.WHITE);

  const colorBlack = CanvasKit.Color(0x3c, 0x40, 0x4c);

  const textStyle = new CanvasKit.TextStyle({
    color: colorBlack,
    fontFamilies: ["pcr", "Microsoft YaHei"],
    heightMultiplier: 1.2,
    fontSize: 20,
  });

  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle,
    textAlign: CanvasKit.TextAlign.Right,
  });

  const fgPaint = new CanvasKit.Paint();
  fgPaint.setColor(CanvasKit.WHITE);
  fgPaint.setStyle(CanvasKit.PaintStyle.Stroke);
  fgPaint.setStrokeWidth(2);

  const bgPaint = new CanvasKit.Paint();
  bgPaint.setColor(CanvasKit.TRANSPARENT);

  const imgPaint = new CanvasKit.Paint();

  for (const [i, imgPath] of imgList.entries()) {
    const img = await loadImage(getAsset(imgPath));
    const x = (i % 5) * cellSize;
    const y = Math.floor(i / 5) * cellSize;
    const name = imgPath.slice(0, -4);
    const srcRect = [0, 0, img.width(), img.height()];
    const destRect =
      img.width() > img.height()
        ? [x, y, x + cellSize, y + (cellSize / img.width()) * img.height()]
        : [x, y, x + (cellSize / img.height()) * img.width(), y + cellSize];
    canvas.drawImageRect(img, srcRect, destRect, imgPaint);

    const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.pushPaintStyle(textStyle, fgPaint, bgPaint);
    builder.addText(name);
    const paragraph = builder.build();
    paragraph.layout(cellSize);
    canvas.drawParagraph(paragraph, x - 4, y + cellSize - 26);

    const builder0 = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder0.addText(name);
    const paragraph0 = builder0.build();
    paragraph0.layout(160);
    canvas.drawParagraph(paragraph0, x - 4, y + cellSize - 26);
  }

  const gridPaint = new CanvasKit.Paint();
  gridPaint.setColor(colorBlack);
  for (let i = 1; i < 5; i++)
    canvas.drawLine(i * cellSize, 0, i * cellSize, surfaceHeight, gridPaint);
  for (let i = 1; i < lineCount; i++)
    canvas.drawLine(0, i * cellSize, surfaceWidth, i * cellSize, gridPaint);

  const borderPaint = new CanvasKit.Paint();
  borderPaint.setColor(colorBlack);
  borderPaint.setStyle(CanvasKit.PaintStyle.Stroke);
  canvas.drawRect([0, 0, surfaceWidth - 1, surfaceHeight - 1], borderPaint);

  const snapshot = surface.makeImageSnapshot();
  const buf = snapshot.encodeToBytes()!;
  snapshot.delete();

  return buf;
}

export async function drawMeme(params: {
  name: string;
  text: string;
  getAsset: (name: string) => string;
}): Promise<string | Uint8Array> {
  const { name, text, getAsset } = params;
  let img;
  try {
    img = await loadImage(getAsset(`${name}.png`));
  } catch {
    return `未找到名为“${name}”的表情`;
  }
  const lines = text.split(" ").filter(Boolean);
  const maxLineWidth = Math.max(...lines.map((v) => v.length));
  if (maxLineWidth > 8) return "每行最多八个字";

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

  return buf;
}
