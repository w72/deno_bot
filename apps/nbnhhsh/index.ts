import { BotApp, BotEvent, listen, filter } from "/core.ts";

export default class App extends BotApp {
  name = "能不能好好说话";
  description = "查询各种缩写";

  @listen("message.group")
  @filter(/^[?？] ?([a-z0-9]+)$/)
  async onGroupMessage(e: BotEvent) {
    const url = "https://lab.magiconch.com/api/nbnhhsh/guess";
    const text = e.match[1];
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((res) => {
        const { name, trans } = res[0];
        if (trans) return e.reply(`${name}: ${trans.join(" ")}`);
        return e.reply(`未查询到${name}的相关翻译`);
      })
      .catch((err) => e.reply(`查询失败：${err.message}`));
  }
}
