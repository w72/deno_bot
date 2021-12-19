import { fontMgr } from "bot";
import { DOMParser, Element } from "deno_dom";
import CanvasKit, { loadImage, Image, Paragraph } from "canvas";
import * as ImageScript from "image_script";
import { basename } from "std/path/mod.ts";

export enum NewsItemType {
  text,
  image,
}

export interface ImageCache {
  [key: string]: Uint8Array;
}

interface RemoteNewsData {
  content: string;
  updated: number;
}

interface NewsItem {
  type: NewsItemType;
  value: string;
}

type DrawItem =
  | {
      type: NewsItemType.text;
      height: number;
      paragraph: Paragraph;
    }
  | {
      type: NewsItemType.image;
      height: number;
      img: Image;
      ratio: number;
    };

export async function fetchTodayNewsData(): Promise<RemoteNewsData> {
  const url =
    "https://www.zhihu.com/api/v4/columns/c_1261258401923026944/items";
  const res = await fetch(url).then((r) => r.json());
  return res.data[0];
}

export function parseNewsContent(content: string): NewsItem[] {
  const doc = new DOMParser().parseFromString(content, "text/html");
  if (!doc) throw new Error("DOM 解析失败");
  const res: NewsItem[] = [];
  for (const node of doc.body.childNodes) {
    const $el = node as Element;
    if ($el.tagName === "P" && $el.innerText.trim()) {
      const text = $el.innerText.replace(/\s/g, "").replace(/；$/, "。");
      if (text && !text.includes("【微语】"))
        res.push({ type: NewsItemType.text, value: text });
    }
    if ($el.tagName === "FIGURE") {
      const src = $el.firstElementChild?.getAttribute("data-original");
      if (src) res.push({ type: NewsItemType.image, value: src });
    }
    if ($el.tagName === "A" && $el.classList.contains("video-box")) {
      const src = $el.getAttribute("data-poster");
      if (src) res.push({ type: NewsItemType.image, value: src });
    }
  }
  return res;
}

export function getImageFileName(src: string): string {
  return basename(new URL(src).pathname);
}

export async function fetchImageCache(items: NewsItem[]): Promise<ImageCache> {
  const imageCache: ImageCache = {};
  for (const item of items) {
    if (item.type === NewsItemType.image) {
      const key = getImageFileName(item.value);
      const img = await fetch(item.value).then((r) => r.arrayBuffer());
      imageCache[key] = new Uint8Array(img);
    }
  }
  return imageCache;
}

export async function draw(
  items: NewsItem[],
  imgCache: ImageCache
): Promise<Uint8Array> {
  const width = 720;
  const padding = 16;
  const contentWidth = width - padding * 2;
  const imageWidth = 480;
  const lineMargin = 8;
  const fgColor = CanvasKit.Color(0x3c, 0x40, 0x4c);

  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle: {
      color: fgColor,
      fontFamilies: ["pcr", "Microsoft YaHei"],
      heightMultiplier: 1.4,
      fontSize: 28,
    },
  });

  const drawItems: DrawItem[] = [];
  for (const [i, item] of items.entries()) {
    if (item.type === NewsItemType.text) {
      const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
      builder.addText(item.value);
      const paragraph = builder.build();
      paragraph.layout(contentWidth);
      const height = paragraph.getHeight();
      drawItems.push({ type: NewsItemType.text, height, paragraph });
    }
    if (item.type === NewsItemType.image) {
      const img = await loadImage(imgCache[getImageFileName(item.value)]);
      let ratio = i === 0 ? 2.8 : img.width() / img.height();
      if (ratio < 16 / 9) ratio = 16 / 9;
      const height = (i === 0 ? width : imageWidth) / ratio;
      drawItems.push({ type: NewsItemType.image, height, img, ratio });
    }
  }

  const height =
    drawItems.reduce((a, v, i) => a + v.height + (i && lineMargin), 0) +
    padding;
  const surface = CanvasKit.MakeSurface(width, height)!;
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.WHITE);

  const imgPaint = new CanvasKit.Paint();
  let yCursor = 0;
  for (const [i, item] of drawItems.entries()) {
    if (item.type === NewsItemType.text) {
      canvas.drawParagraph(item.paragraph, padding, yCursor);
      yCursor += item.height + lineMargin;
    }
    if (item.type === NewsItemType.image) {
      canvas.drawImageRect(
        item.img,
        CanvasKit.XYWHRect(
          0,
          i && (item.img.height() - item.img.width() / item.ratio) / 2,
          item.img.width(),
          item.img.width() / item.ratio
        ),
        CanvasKit.XYWHRect(
          i && (width - imageWidth) / 2,
          yCursor,
          i ? imageWidth : width,
          (i ? imageWidth : width) / item.ratio
        ),
        imgPaint
      );
      yCursor += item.height + lineMargin;
    }
  }

  const snapshot = surface.makeImageSnapshot();
  const buf = snapshot.encodeToBytes()!;
  snapshot.delete();

  const imgPng = await ImageScript.decode(buf);
  const imgJpg = await (imgPng as ImageScript.Image).encodeJPEG(60);

  return imgJpg;
}
