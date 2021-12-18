import CanvasKit, { FontMgr } from "canvas";
import * as path from "std/path/mod.ts";
import { parse } from "std/encoding/yaml.ts";
import { encode } from "std/encoding/base64.ts";

import type { BotMessage, BotConfig, CqMessageSegment } from "./types.ts";

const filePath = path.dirname(path.fromFileUrl(import.meta.url));
export const rootPath = path.join(filePath, "..");
export const appsPath = path.join(rootPath, "apps");

const configPath = path.join(rootPath, "config.yml");
const configFile = await Deno.readTextFile(configPath);
export const config = parse(configFile) as BotConfig;

async function getFontMgr(): Promise<FontMgr> {
  const assetFontPcr = path.join(rootPath, "assets/font/TTQinYuanJ-W3.ttf");
  const assetFontYh = path.join(rootPath, "assets/font/msyh.ttc");
  const fontPcr = await Deno.readFile(assetFontPcr);
  const fontYh = await Deno.readFile(assetFontYh);
  return CanvasKit.FontMgr.FromData(fontPcr, fontYh)!;
}
export const fontMgr = await getFontMgr();

export function cqMessage(msg: BotMessage): CqMessageSegment[] {
  if (!msg) return [];
  return (Array.isArray(msg) ? msg : [msg])
    .filter((v): v is string | Uint8Array | CqMessageSegment => Boolean(v))
    .map((v) =>
      typeof v === "string"
        ? { type: "text", data: { text: v } }
        : v instanceof Uint8Array
        ? { type: "image", data: { file: `base64://${encode(v)}` } }
        : v
    );
}
