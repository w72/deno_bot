import { BotApp, BotEvent, name, listen, filter, cron, cqMessage } from "bot";
import dayjs from "dayjs";
import { Deferred, deferred, delay } from "std/async/mod.ts";
import { ensureDir } from "std/fs/mod.ts";
import * as log from "std/log/mod.ts";

import {
  fetchTodayNewsData,
  parseNewsContent,
  fetchImageCache,
  draw,
} from "./draw.ts";

interface Props {
  groups: number[];
}

interface State {
  fetching: Deferred<Uint8Array | undefined> | undefined;
}

export default class App extends BotApp<Props, State> {
  name = "每日新闻";
  description = "每天60秒读懂世界";

  async getTodayNewsImage(): Promise<Uint8Array | undefined> {
    const { fetching } = this.state;
    if (fetching) return fetching;
    this.state.fetching = deferred();
    const now = dayjs();
    const today =
      now.hour() < 5 ? now.subtract(1, "d").startOf("d") : now.startOf("d");
    const date = today.format("YYYY-MM-DD");
    const imgPath = this.asset(`${date}.jpg`);
    let img: Uint8Array | undefined;
    try {
      img = await Deno.readFile(imgPath);
      log.info(`获取 ${date} 新闻，使用缓存`);
    } catch {
      log.info(`获取 ${date} 新闻，从网页拉取`);
      const news = await fetchTodayNewsData();
      const newsDay = dayjs(news.updated * 1000).startOf("d");
      if (newsDay.isBefore(today)) throw new Error("源未更新");
      const items = parseNewsContent(news.content);
      const imageCache = await fetchImageCache(items);
      img = await draw(items, imageCache);
      await ensureDir(this.asset());
      await Deno.writeFile(imgPath, img);
      log.info(`获取 ${date} 新闻，生成图片成功`);
    } finally {
      this.state.fetching.resolve(img);
      this.state.fetching = undefined;
    }
    return img;
  }

  @name("每日新闻")
  @listen("message.group")
  @filter(/^每日新闻$/)
  async onDailyNews(e: BotEvent) {
    const img = await this.getTodayNewsImage();
    if (img) await e.reply(img);
  }

  @name("每日新闻推送")
  @cron("5 8 * * *")
  async onDailyNewsPush() {
    const img = await this.getTodayNewsImage();
    if (img) {
      for (const groupId of this.props.groups) {
        await this.api.send_group_msg({
          group_id: groupId,
          message: cqMessage(img),
        });
        await delay(10 * 1000);
      }
    }
  }
}
