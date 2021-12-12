import CanvasKit, { loadImage, Canvas, TextAlign } from "canvas";
import * as log from "std/log/mod.ts";
import { fontMgr } from "/core.ts";
import { weightedRandom } from "./utils.ts";
import { Character, State, Pool } from "./types.ts";

function drawText(
  canvas: Canvas,
  params: {
    x: number;
    y: number;
    text: string;
    size?: number;
    align?: TextAlign;
  }
): void {
  const { x, y, text, size = 104, align } = params;
  const colorBlack = CanvasKit.Color(0x3c, 0x40, 0x4c);

  const textStyle = new CanvasKit.TextStyle({
    color: colorBlack,
    fontFamilies: ["pcr", "Microsoft YaHei"],
    heightMultiplier: 1.2,
    fontSize: 20,
  });

  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle,
    textAlign: align,
  });

  const fgPaint = new CanvasKit.Paint();
  fgPaint.setColor(CanvasKit.WHITE);
  fgPaint.setStyle(CanvasKit.PaintStyle.Stroke);
  fgPaint.setStrokeWidth(2);

  const bgPaint = new CanvasKit.Paint();
  bgPaint.setColor(CanvasKit.TRANSPARENT);

  const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.pushPaintStyle(textStyle, fgPaint, bgPaint);
  builder.addText(text);
  const paragraph = builder.build();
  paragraph.layout(size);
  canvas.drawParagraph(paragraph, x, y);

  const builder0 = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder0.addText(text);
  const paragraph0 = builder0.build();
  paragraph0.layout(size);
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
  canvas.drawImage(assets.starBg, starX, starY, imgPaint);
  for (let i = star - 1; i >= 0; i--) {
    canvas.drawImage(assets.star, starX + 13 * i, starY, imgPaint);
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
    canvas.drawImage(assets.new, x - 12, y - 14, imgPaint);
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
    drawText(canvas, { text: `${characterName}`, x: x + 4, y: y + 21 });
    drawText(canvas, {
      text: info,
      x: x + size - 6,
      y: y + size - 6,
      align: CanvasKit.TextAlign.End,
    });
  }
}

export async function gacha(
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

  canvas.drawImage(assets.background, 0, 0, new CanvasKit.Paint());

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
  if (alert) canvas.drawImage(assets.alert, 278, 415, new CanvasKit.Paint());

  drawCount(canvas, { data, start });

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
  const id = list[Math.floor(Math.random() * list.length)];
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
