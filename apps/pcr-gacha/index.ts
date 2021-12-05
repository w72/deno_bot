import { BotApp, BotEvent, name, listen, filter, cron } from "/core.ts";
import { loadImage, Image } from "canvas";

import { ensurePcrFiles, updatePool } from "./utils.ts";
import { Pool, Assets, Names } from "./types.ts";

interface Props {
  pool: string;
}
interface State {
  ver: string;
  img: Record<string, Image>;
  pool: Pool;
  names: Names;
  assets: Assets;
}

export default class App extends BotApp<Props, State> {
  name = "PCR抽卡";

  async init() {
    const assets: Assets = {
      ver: this.asset("../pcr-data/ver.json"),
      pools: this.asset("../pcr-data/pools.json"),
      names: this.asset("../pcr-data/names.json"),
    };
    const { ver, pools, names } = await ensurePcrFiles(assets);

    this.state.assets = assets;
    this.state.ver = ver;
    this.state.names = names;
    this.state.pool = pools[this.props.pool];

    this.state.img = {
      background: await loadImage(this.asset("background.png")),
      alert: await loadImage(this.asset("alert.png")),
      border: await loadImage(this.asset("border.png")),
      color: await loadImage(this.asset("color.png")),
      blink: await loadImage(this.asset("blink.png")),
      new: await loadImage(this.asset("new.png")),
      star: await loadImage(this.asset("star.png")),
      starBg: await loadImage(this.asset("star-background.png")),
      dialog: await loadImage(this.asset("dialog.png")),
    };
  }

  @name("抽卡")
  @listen("message.group")
  @filter(/^单抽|十连|抽一井|来一井$/, { at: true })
  async onGacha() {}

  @name("更新卡池")
  @listen("message.group")
  @filter(/^(强制)?更新卡池$/, { admin: true })
  async onUpdatePool(e: BotEvent) {
    const { assets } = this.state;
    const force = Boolean(e.match[1]);
    try {
      const msg = await updatePool(assets, force);
      return e.reply(msg);
    } catch (e) {
      this.log.error(e);
      if (e.message) return e.reply(e.message);
    }
  }

  @name("每天17:10自动更新卡池")
  @cron("10 17 * * *")
  async onAutoUpdatePool() {
    const { assets } = this.state;
    try {
      const msg = await updatePool(assets);
      this.log.info(msg);
    } catch (e) {
      this.log.error(e);
    }
  }
}
