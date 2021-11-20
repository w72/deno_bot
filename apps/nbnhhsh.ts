import { BotApp, BotEvent, listen, filter } from "/core.ts";

export default class Nbnhhsh extends BotApp {
  key = "nbnhhsh";
  name = "能不能好好说话";
  description = "查询各种缩写";

  @listen("message.group")
  @filter(/^[?？] ?([a-z0-9]+)$/)
  async onGroupMessage(e: BotEvent) {
    const url = "https://lab.magiconch.com/api/nbnhhsh/guess";
    const text = e.match[1];
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json());
    const { name, trans } = res[0];
    await e.reply(`${name}: ${trans.join(" ")}`);
  }
}
