import { BotApp, BotEvent, listen, filter, config } from "bot";
import * as ImageScript from "image_script";
import * as log from "std/log/mod.ts";

interface Props {
  apikey: string;
  r18: string;
  maxHeight: number;
  quality: number;
}
export default class App extends BotApp<Props> {
  name = "涩图";
  description = "来一发瑟图！";

  @listen("message.group")
  @filter(
    /^来一?[点份张](.{0,6}?)的?[色涩瑟]图$|^[色涩瑟]图$|^[色涩瑟]图\s(.{0,6}?)$/
  )
  async onGroupMessage(e: BotEvent) {
    const { apikey, r18, maxHeight, quality } = this.props;
    const keyword = e.match[1] || e.match[2] || "";
    const { names } = config;
    const url = "https://api.lolicon.app/setu/";
    const params = new URLSearchParams({ apikey, keyword, r18 });
    const res = await fetch(`${url}?${params}`)
      .then((r) => r.json())
      .catch((e) => e);
    if (res.code === 0) {
      const { url, title, author, pid } = res.data[0];
      log.info(`正在下载涩图 ${url}`);
      try {
        const imgBuffer = await fetch(url).then((r) => r.arrayBuffer());
        const img = await ImageScript.decode(new Uint8Array(imgBuffer));
        const imgFrame = img instanceof ImageScript.GIF ? img[0] : img;
        const imgParsed = await imgFrame
          .resize(ImageScript.Image.RESIZE_AUTO, maxHeight)
          .encodeJPEG(quality);
        const description = `${title}\n画师：${author}\npid：${pid}`;
        await e.reply([description, imgParsed]);
        log.info(`涩图下载成功`);
      } catch (err) {
        await e.reply(`涩图下载失败${err.message ? `：${err.message}` : ""}`);
        log.info(`涩图下载失败`);
        log.info(err);
      }
    } else if (keyword && res.code === 404) {
      await e.reply(
        `没有找到“${keyword}”的涩图，试试输入“来点${names[0]}涩图”吧！`
      );
    } else {
      await e.reply(`涩图获取失败：${res.msg || res.message}`);
    }
  }
}
