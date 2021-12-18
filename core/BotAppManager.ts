import { Reflect } from "reflect_metadata";
import { cron as denoCron } from "deno_cron";
import * as log from "std/log/mod.ts";
import * as path from "std/path/mod.ts";

import { appsPath } from "./utils.ts";
import { BotEventBus } from "./BotEventBus.ts";
import { BotWebSocket } from "./BotWebSocket.ts";
import type { BotApp } from "./BotApp.ts";
import type { BotListener } from "./types.ts";

export class BotAppManager {
  apps: BotApp[] = [];
  modules: Record<string, typeof BotApp> = {};

  static getMetadata(ins: BotApp): BotListener[] {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(ins))
      .map((v): BotListener | null => {
        if (v === "constructor") return null;
        const fn = (ins as unknown as Record<string, unknown>)[v];
        if (typeof fn !== "function") return null;
        const listen = Reflect.getMetadata("listen", ins, v);
        const cron = Reflect.getMetadata("cron", ins, v);
        if (listen) {
          const filter = Reflect.getMetadata("filter", ins, v) ?? {};
          return { app: ins.key, listen, filter, handler: fn.bind(ins) };
        }
        if (cron) return { app: ins.key, cron, handler: fn.bind(ins) };
        return null;
      })
      .filter((v): v is BotListener => Boolean(v));
  }

  async run() {
    for await (const v of Deno.readDir(appsPath)) {
      if (!v.isDirectory) continue;
      const indexPath = path.join(appsPath, v.name, "index.ts");
      try {
        const res = await import(path.toFileUrl(indexPath).href);
        const App: typeof BotApp | undefined = res.default;
        if (App) {
          this.modules[v.name] = App;
        } else {
          log.warning(`应用加载失败: ${v.name} 无默认导出`);
        }
      } catch (err) {
        log.warning(`应用加载失败: ${v.name}`);
        log.warning(err);
      }
    }

    const botEventBus = new BotEventBus();
    const botWebSocket = new BotWebSocket(botEventBus);

    for (const [key, App] of Object.entries(this.modules)) {
      this.apps.push(new App(key, botWebSocket.api));
    }

    for (const app of this.apps) {
      const appFullName = `${app.key}${app.name ? ` - ${app.name}` : ""}`;
      try {
        await app.init();
      } catch (err) {
        log.info(`应用初始化失败: ${appFullName}`);
        log.info(err);
        continue;
      }
      log.info(`已加载应用 ${appFullName}`);
      const metadata = BotAppManager.getMetadata(app);
      for (const v of metadata) {
        if ("listen" in v) botEventBus.listen(v);
        if ("cron" in v) denoCron(v.cron, v.handler);
      }
    }

    botWebSocket.connect();
  }
}
