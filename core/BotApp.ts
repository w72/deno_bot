import * as log from "std/log/mod.ts";
import * as path from "std/path/mod.ts";

import { config, rootPath } from "./utils.ts";
import type { BotApi } from "./types.ts";

export class BotApp<
  Props = Record<string, unknown>,
  State = Record<string, unknown>
> {
  name = "";
  description = "";
  log = log;
  props: Props = {} as Props;
  state: State = {} as State;
  assetPath: string;

  constructor(public key: string, public api: BotApi) {
    this.props = config.apps?.[key] ?? {};
    this.asset = this.asset.bind(this);
    this.assetPath = path.join(rootPath, "assets", key);
  }

  asset(...paths: string[]) {
    return path.join(this.assetPath, ...paths);
  }

  init(): Promise<void> | void {}
}
