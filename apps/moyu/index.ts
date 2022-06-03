import { BotApp, BotEvent, name, listen, filter, cron, cqMessage } from "bot";
import { delay } from "std/async/mod.ts";

interface Props {
  groups: number[];
}

export default class App extends BotApp<Props> {
  name = "摸鱼";
  description = "每日摸鱼";

  getImage(): Promise<Uint8Array> {
    const url = "https://api.emoao.com/api/moyu";
    return fetch(url)
      .then((r) => r.arrayBuffer())
      .then((res) => new Uint8Array(res));
  }

  @listen("message.group")
  @filter(/^摸鱼$/)
  async onMoyu(e: BotEvent) {
    await this.getImage()
      .then((img) => e.reply(img))
      .catch((err) => e.reply(`摸鱼失败：${err.message}`));
  }

  @name("每日摸鱼推送")
  @cron("5 8 * * *")
  async onDailyMoyu() {
    const img = await this.getImage();
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
