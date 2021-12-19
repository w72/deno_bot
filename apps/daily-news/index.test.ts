import { BotEvent, testPath } from "bot";
import { join } from "std/path/mod.ts";
import { ensureDir } from "std/fs/mod.ts";

import {
  draw,
  fetchTodayNewsData,
  parseNewsContent,
  fetchImageCache,
  getImageFileName,
  ImageCache,
  NewsItemType,
} from "./draw.ts";
import App from "./index.ts";

const imgCacheDir = join(testPath, "daily-news-image");
const contentPath = join(testPath, "daily-news-content.html");

Deno.test("daily-news draw", async () => {
  let content;
  try {
    content = await Deno.readTextFile(contentPath);
    console.log("use html cache");
  } catch {
    const news = await fetchTodayNewsData();
    content = news.content;
    await Deno.writeTextFile(contentPath, content);
  }
  const items = parseNewsContent(content);
  await ensureDir(imgCacheDir);

  const currentCacheFiles: string[] = [];
  for await (const file of Deno.readDir(imgCacheDir)) {
    currentCacheFiles.push(file.name);
  }

  const targetCacheFiles = items
    .filter((v) => v.type === NewsItemType.image)
    .map((v) => getImageFileName(v.value));

  const useCache = targetCacheFiles.every((v) => currentCacheFiles.includes(v));

  let imageCache: ImageCache = {};
  if (useCache) {
    console.log("use image cache");
    for (const fileName of targetCacheFiles) {
      imageCache[fileName] = await Deno.readFile(join(imgCacheDir, fileName));
    }
  } else {
    imageCache = await fetchImageCache(items);
    for (const [key, img] of Object.entries(imageCache)) {
      await Deno.writeFile(join(imgCacheDir, key), img);
    }
  }
  const buf = await draw(items, imageCache);
  await Deno.writeFile(join(testPath, "daily-news.jpg"), buf);
});

Deno.test("daily-news cmd", async () => {
  const app = new App("daily-news", {});
  await app.onDailyNews({
    reply: (v: Uint8Array) =>
      Deno.writeFile(join(testPath, "daily-news-cmd.jpg"), v),
  } as BotEvent);
});
