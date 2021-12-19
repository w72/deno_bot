import { fontMgr } from "bot";
import CanvasKit, { loadImage, Canvas, TextAlign, Image } from "canvas";
import * as log from "std/log/mod.ts";
import { countBy } from "deno_dash/collection/countBy.ts";
import { sampleOne } from "deno_dash/collection/sampleOne.ts";

import { weightedRandom } from "./utils.ts";
import { Character, State, Pool, Dimension } from "./types.ts";

function drawText(
  canvas: Canvas,
  params: {
    x: number;
    y: number;
    text: string;
    width: number;
    textAlign?: TextAlign;
    fontSize?: number;
    fgColor?: Float32Array;
    bgColor?: Float32Array;
    strokeWidth?: number;
  }
): void {
  const {
    x,
    y,
    text,
    width,
    textAlign,
    fontSize = 16,
    strokeWidth = 2,
    fgColor = CanvasKit.Color(0x3c, 0x40, 0x4c),
    bgColor = CanvasKit.WHITE,
  } = params;

  const textStyle = new CanvasKit.TextStyle({
    color: fgColor,
    fontFamilies: ["pcr", "Microsoft YaHei"],
    heightMultiplier: 1,
    fontSize,
  });

  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle,
    textAlign,
  });

  const fgPaint = new CanvasKit.Paint();
  fgPaint.setColor(bgColor);
  fgPaint.setStyle(CanvasKit.PaintStyle.Stroke);
  fgPaint.setStrokeWidth(strokeWidth);

  const bgPaint = new CanvasKit.Paint();
  bgPaint.setColor(CanvasKit.TRANSPARENT);

  const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.pushPaintStyle(textStyle, fgPaint, bgPaint);
  builder.addText(text);
  const paragraph = builder.build();
  paragraph.layout(width);
  canvas.drawParagraph(paragraph, x, y);

  const builder0 = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder0.addText(text);
  const paragraph0 = builder0.build();
  paragraph0.layout(width);
  canvas.drawParagraph(paragraph0, x, y);
}

function drawCount(
  canvas: Canvas,
  params: {
    data: Character[];
    start: number;
  }
) {
  const { data, start } = params;
  const colorBlack = CanvasKit.Color(0x3c, 0x40, 0x4c);

  const textStyle = new CanvasKit.TextStyle({
    color: colorBlack,
    fontFamilies: ["pcr", "Microsoft YaHei"],
    heightMultiplier: 1,
    fontSize: 16,
  });

  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle,
    textAlign: CanvasKit.TextAlign.Right,
  });

  const builder0 = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder0.addText(`${start}`);
  const paragraph0 = builder0.build();
  paragraph0.layout(80);
  canvas.drawParagraph(paragraph0, 618, 371);

  const fgPaint = new CanvasKit.Paint();
  fgPaint.setShader(
    CanvasKit.Shader.MakeLinearGradient(
      [740, 371],
      [740, 371 + 16],
      [CanvasKit.Color(0xf5, 0xc0, 0x50), CanvasKit.Color(0xd5, 0x71, 0x1b)],
      null,
      CanvasKit.TileMode.Clamp
    )
  );

  const bgPaint = new CanvasKit.Paint();
  bgPaint.setColor(CanvasKit.TRANSPARENT);

  const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.pushPaintStyle(textStyle, fgPaint, bgPaint);
  builder.addText(`${start + data.length}(+${data.length})`);
  const paragraph = builder.build();
  paragraph.layout(80);
  canvas.drawParagraph(paragraph, 740, 371);
}

async function drawAvatar(
  canvas: Canvas,
  params: {
    character: Character;
    assets: State["assets"];
    getAsset: (name: string) => string;
    x: number;
    y: number;
    size?: number;
    info?: string;
    isNew?: boolean;
    blink?: boolean;
  }
): Promise<void> {
  const {
    character: { avatar, star, name },
    getAsset,
    assets,
    x,
    y,
    size = 104,
    info = "",
    isNew = false,
    blink = false,
  } = params;
  const assetPath = getAsset(`../pcr/icon/unit/${avatar}.png`);

  let imgAvatar;
  try {
    imgAvatar = await loadImage(assetPath);
  } catch {
    const urlAvatar = `https://redive.estertion.win/icon/unit/${avatar}.webp`;
    log.info(`开始下载 PCR 角色头像: ${avatar}`);
    const res = await fetch(urlAvatar)
      .then((r) => r.arrayBuffer())
      .catch(() => null);
    if (!res) {
      log.error(`PCR 角色头像下载失败: ${avatar}`);
      throw new Error("获取头像失败");
    } else {
      log.info(`PCR 角色头像下载成功: ${avatar}`);
    }
    imgAvatar = await loadImage(new Uint8Array(res));
    await Deno.writeFile(assetPath, imgAvatar.encodeToBytes()!);
  }

  const imgPaint = new CanvasKit.Paint();
  const destRect = CanvasKit.XYWHRect(x, y, size, size);
  canvas.drawImageRect(
    imgAvatar,
    [0, 0, imgAvatar.width(), imgAvatar.height()],
    destRect,
    imgPaint
  );
  canvas.drawImageRect(
    assets.border,
    [0, 0, assets.border.width(), assets.border.height()],
    destRect,
    imgPaint
  );
  const starX = x + 6;
  const starY = y + size - 23;
  canvas.drawImage(assets.starBg, starX, starY, null);
  for (let i = star - 1; i >= 0; i--) {
    canvas.drawImage(assets.star, starX + 13 * i, starY, null);
  }
  if (star === 3) {
    canvas.drawImageRect(
      assets.color,
      [0, 0, assets.color.width(), assets.color.height()],
      destRect,
      imgPaint
    );
  }
  if (isNew) {
    canvas.drawImage(assets.new, x - 12, y - 14, null);
  }
  if (blink && star > 1) {
    const count = star === 2 ? 8 : 36;
    for (let i = 0; i < count; i++) {
      const [w, h] = weightedRandom([
        [[18, 22], 1],
        [[13, 16], 2],
        [[8, 10], star === 2 ? 0 : 3],
      ]);
      const rho = size * (0.32 + Math.random() * 0.32);
      const theta = (359 * Math.random() * Math.PI) / 180;
      const randX = rho * Math.cos(theta);
      const randY = rho * Math.sin(theta);
      const X = x + size / 2 + randX - w / 2;
      const Y = y + size / 2 + randY - h / 2;
      canvas.drawImageRect(
        assets.blink,
        [0, 0, assets.blink.width(), assets.blink.height()],
        CanvasKit.XYWHRect(X, Y, w, h),
        imgPaint
      );
    }
  }
  if (info) {
    const characterName = name.replace("（", "(").replace("）", ")");
    drawText(canvas, {
      text: `${characterName}`,
      x: x + 4,
      y: y + 4,
      width: size - 8,
    });
    drawText(canvas, {
      text: info,
      x: x + 4,
      y: y + size - 22,
      textAlign: CanvasKit.TextAlign.End,
      width: size - 8,
    });
  }
}

function drawImageNine(
  canvas: Canvas,
  params: {
    image: Image;
    dimension: Dimension;
    x: number;
    y: number;
    ox?: number;
    oy?: number;
  }
) {
  const { dimension: dim, image, x, y, ox = 0, oy = 0 } = params;
  const { top: t, right: r, bottom: b, left: l, width: w, height: h } = dim;
  const imgPainter = new CanvasKit.Paint();
  const draw = (
    x0: number,
    y0: number,
    w0: number,
    h0: number,
    x1: number,
    y1: number,
    w1: number,
    h1: number
  ) =>
    canvas.drawImageRect(
      image,
      CanvasKit.XYWHRect(x0, y0, w0, h0),
      CanvasKit.XYWHRect(x1, y1, w1, h1),
      imgPainter
    );

  draw(0, 0, l, t, ox, oy, l, t); // 左上
  draw(l + w, 0, r, t, l + w * x + ox, oy, r, t); // 右上
  draw(0, t + h, l, b, ox, t + h * y + oy, l, b); // 左下
  draw(l + w, t + h, r, b, l + w * x + ox, t + h * y + oy, r, b); // 右下
  for (let i = 0; i < y; i++) {
    draw(0, t, l, h, ox, t + h * i + oy, l, h); // 左
    draw(l + w, t, r, h, l + w * x + ox, t + h * i + oy, r, h); // 右边
  }
  for (let i = 0; i < x; i++) {
    draw(l, 0, w, t, l + w * i + ox, oy, w, t); // 上
    draw(l, t + h, w, b, l + w * i + ox, t + h * y + oy, w, b); // 下
    for (let j = 0; j < y; j++) {
      draw(l, t, w, h, l + w * i + ox, t + h * j + oy, w, h); // 中间
    }
  }
}

export async function gacha10(
  data: Character[],
  params: {
    state: State;
    getAsset: (name: string) => string;
    start?: number;
  }
): Promise<Uint8Array> {
  const { state, getAsset, start = 0 } = params;
  const { assets, pool } = state;
  const surface = CanvasKit.MakeSurface(1024, 576)!;
  const canvas = surface.getCanvas();

  canvas.drawImage(assets.background, 0, 0, null);

  for (const [i, character] of data.entries()) {
    await drawAvatar(canvas, {
      assets,
      getAsset,
      character,
      x: 190 + 136 * (i % 5),
      y: 116 + 136 * Math.floor(i / 5),
      blink: true,
      isNew: pool.up.includes(data[i].id),
    });
  }

  const alert = false;
  if (alert) canvas.drawImage(assets.alert, 278, 415, null);

  drawCount(canvas, { data, start });

  const snapshot = surface.makeImageSnapshot();
  const buf = snapshot.encodeToBytes()!;
  snapshot.delete();

  return buf;
}

export async function gacha300(
  data: Character[],
  params: {
    state: State;
    getAsset: (name: string) => string;
    name?: string;
  }
): Promise<Uint8Array> {
  const { name = "", state, getAsset } = params;
  const dataStar3 = data
    .map((v, i) => ({ ...v, index: i + 1 }))
    .filter((v) => v.star === 3);

  const { assets } = state;

  const bg: Dimension = {
    width: 26,
    height: 10,
    top: 40,
    right: 39,
    bottom: 54,
    left: 39,
  };
  const num = 4;
  const cell = 116;
  const cellPadding = 12;
  const contextX = num * cell - cellPadding;
  const padding = 12;
  const paddingTop = 80;
  const paddingBottom = 20;
  const paddingY = paddingTop + paddingBottom;
  const contextY = Math.ceil(dataStar3.length / num) * cell - cellPadding;
  const xRepeatCount = Math.ceil(
    (contextX + padding * 2 - bg.left - bg.right) / bg.width
  );
  const yRepeatCount = Math.ceil(
    (contextY + paddingY - bg.top - bg.bottom) / bg.height
  );
  const width = bg.left + bg.right + bg.width * xRepeatCount;
  const height = bg.top + bg.bottom + bg.height * yRepeatCount;
  const paddingLeft = (width - contextX) / 2;

  const surface = CanvasKit.MakeSurface(width, height)!;
  const canvas = surface.getCanvas();

  drawImageNine(canvas, {
    image: assets.dialog,
    dimension: bg,
    x: xRepeatCount,
    y: yRepeatCount,
  });
  drawText(canvas, {
    text: `${name}本次下井结果`,
    x: paddingLeft,
    y: 8,
    width: contextX,
    textAlign: CanvasKit.TextAlign.Center,
    fontSize: 22,
    fgColor: CanvasKit.WHITE,
    bgColor: CanvasKit.Color(0x45, 0x65, 0x8c),
  });

  for (let i = 0; i < dataStar3.length; i++) {
    await drawAvatar(canvas, {
      character: dataStar3[i],
      x: paddingLeft + cell * (i % num),
      y: paddingTop + cell * Math.floor(i / num),
      assets,
      getAsset,
      info: `№${dataStar3[i].index}`,
    });
  }

  const { pool } = state;
  const starCounts = countBy((v) => v.star, data);
  const soul = starCounts[1] + starCounts[2] * 10 + starCounts[3] * 50;

  const upIndex = data.findIndex((v) => pool.up.includes(v.id));

  const colorBlack = CanvasKit.Color(0x3c, 0x40, 0x4c);
  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle: {
      color: colorBlack,
      fontFamilies: ["pcr", "Microsoft YaHei"],
      heightMultiplier: 1,
      fontSize: 20,
    },
  });
  const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.addText(
    (upIndex === -1 ? `未获得UP角色` : `第 ${upIndex + 1} 抽获得UP角色`) +
      `，获得女神的秘石 ${soul} 个`
  );
  const paragraph = builder.build();
  paragraph.layout(contextX + paddingLeft);
  canvas.drawParagraph(paragraph, paddingLeft, 50);

  const snapshot = surface.makeImageSnapshot();
  const buf = snapshot.encodeToBytes()!;
  snapshot.delete();

  return buf;
}

export function get1(state: State, isTenth = false): Character {
  const { pool, names } = state;
  const { up_prob: upProb, s3_prob: s3Prob, s2_prob: s2Prob } = pool;
  const type = isTenth
    ? weightedRandom([
        ["up", upProb],
        ["star3", s3Prob],
        ["star2", 1000 - upProb - s3Prob],
      ])
    : weightedRandom([
        ["up", upProb],
        ["star3", s3Prob],
        ["star2", s2Prob],
        ["star1", 1000 - upProb - s3Prob - s2Prob],
      ]);
  const list =
    pool[type as keyof Pick<Pool, "up" | "star3" | "star2" | "star1">];
  const id = sampleOne(list);
  const star = type === "up" ? 3 : Number(type.slice(-1));
  const name = names[id][1] || names[id][0];
  const avatar = `${id}${star === 3 ? 3 : 1}1`;
  return { id, star, name, avatar };
}

export function get10(state: State): Character[] {
  return Array(10)
    .fill(null)
    .map((_v, i) => get1(state, i === 9 ? true : false));
}

export function get300(state: State): Character[] {
  return Array(30)
    .fill(null)
    .flatMap(() => get10(state));
}
