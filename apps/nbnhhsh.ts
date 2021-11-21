import { BotApp, BotEvent, listen, filter } from "/core.ts";

export default class App extends BotApp {
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
    })
      .then((r) => r.json())
      .catch((e) => e);
    if (res instanceof Error) {
      await e.reply(`查询失败：${res.message}`);
    } else {
      const { name, trans } = res[0];
      if (trans) await e.reply(`${name}: ${trans.join(" ")}`);
      else await e.reply(`未查询到${name}的相关翻译`);
    }
  }
}
