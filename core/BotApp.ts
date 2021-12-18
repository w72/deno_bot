import * as log from "std/log/mod.ts";
import * as path from "std/path/mod.ts";

import { config, rootPath } from "./utils.ts";
import type { BotWebSocket } from "./BotWebSocket.ts";

export class BotApp<Props = Record<string, any>, State = Record<string, any>> {
  name = "";
  description = "";
  log = log;
  props: Props = {} as Props;
  state: State = {} as State;
  assetPath: string;
  constructor(public key: string, public api: BotWebSocket["api"]) {
    this.props = config.apps?.[key] ?? {};
    this.asset = this.asset.bind(this);
    this.assetPath = path.join(rootPath, "assets", key);
  }
  asset(...paths: string[]) {
    return path.join(this.assetPath, ...paths);
  }
  init(): Promise<void> | void {}
}
