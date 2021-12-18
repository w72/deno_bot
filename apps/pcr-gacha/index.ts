import { BotApp, BotEvent, name, listen, filter, cron } from "bot";
import { loadImage } from "canvas";

import { ensurePcrFiles, updatePool } from "./utils.ts";
import { gacha10, gacha300, get1, get10, get300 } from "./gacha.ts";
import { DataPaths, Props, State, Character } from "./types.ts";

export default class App extends BotApp<Props, State> {
  name = "PCR抽卡";

  async init() {
    const dataPaths: DataPaths = {
      ver: this.asset("../pcr-data/ver.json"),
      pools: this.asset("../pcr-data/pools.json"),
      names: this.asset("../pcr-data/names.json"),
    };
    const { ver, pools, names } = await ensurePcrFiles(dataPaths);

    this.state.dataPaths = dataPaths;
    this.state.ver = ver;
    this.state.names = names;
    this.state.pool = pools[this.props.pool];

    const loadImg = (v: string) => loadImage(this.asset(v));
    this.state.assets = {
      background: await loadImg("background.png"),
      alert: await loadImg("alert.png"),
      border: await loadImg("border.png"),
      color: await loadImg("color.png"),
      blink: await loadImg("blink.png"),
      new: await loadImg("new.png"),
      star: await loadImg("star.png"),
      starBg: await loadImg("star-background.png"),
      dialog: await loadImg("dialog.png"),
    };
  }

  @name("抽卡")
  @listen("message.group")
  @filter(/^单抽|十连|抽一井|来一井$/, { at: true })
  async onGacha(e: BotEvent) {
    let data: Character[] = [];
    switch (e.cmd) {
      case "单抽":
        data = [get1(this.state)];
        break;
      case "十连":
        data = get10(this.state);
        break;
      case "抽一井":
      case "来一井":
        data = get300(this.state);
        break;
    }
    try {
      let res;
      if (data.length <= 10) {
        res = await gacha10(data, {
          state: this.state,
          getAsset: this.asset,
        });
      } else {
        const { card, nickname } = await this.api.get_group_member_info({
          group_id: e.data.group_id,
          user_id: e.data.user_id,
        });
        res = await gacha300(data, {
          state: this.state,
          getAsset: this.asset,
          name: card || nickname,
        });
      }
      return e.reply(res);
    } catch (err) {
      this.log.error(err);
      if (err.message) return e.reply(err.message);
    }
  }

  @name("更新卡池")
  @listen("message.group")
  @filter(/^(强制)?更新卡池$/, { admin: true })
  async onUpdatePool(e: BotEvent) {
    const { dataPaths } = this.state;
    const force = Boolean(e.match[1]);
    try {
      const msg = await updatePool(dataPaths, force);
      return e.reply(msg);
    } catch (err) {
      this.log.error(err);
      if (err.message) return e.reply(err.message);
    }
  }

  @name("每天17:10自动更新卡池")
  @cron("10 17 * * *")
  async onAutoUpdatePool() {
    const { dataPaths } = this.state;
    try {
      const msg = await updatePool(dataPaths);
      this.log.info(msg);
    } catch (e) {
      this.log.error(e);
    }
  }
}
