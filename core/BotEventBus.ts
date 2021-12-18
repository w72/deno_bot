import * as log from "std/log/mod.ts";
import type { BotEvent } from "./BotEvent.ts";
import type { BotEventListener } from "./types.ts";

export class BotEventBus {
  #listeners: BotEventListener[] = [];
  async emit(eventName: string, e: BotEvent) {
    for (const { app, filter, listen, handler } of this.#listeners) {
      if (listen !== eventName) continue;
      if (filter.at && !e.at) continue;
      if (filter.image && !e.image) continue;
      if (filter.admin && !e.admin) continue;
      if (filter.pattern) {
        const match = filter.pattern.exec(e.cmd);
        if (!match) continue;
        e.match = match;
      }
      try {
        await handler(e);
      } catch (e) {
        log.error(`${app}发生了错误: `);
        log.error(e);
      }
    }
  }

  listen(event: BotEventListener) {
    this.#listeners.push(event);
  }

  remove(app: string) {
    this.#listeners = this.#listeners.filter((v) => v.app !== app);
  }
}
