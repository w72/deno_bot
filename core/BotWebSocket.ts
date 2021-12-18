import * as log from "std/log/mod.ts";
import { deferred, Deferred } from "std/async/mod.ts";

import { config } from "./utils.ts";
import { BotEvent } from "./BotEvent.ts";
import type { BotEventBus } from "./BotEventBus.ts";
import type { CqResponseData, CqData, BotApi } from "./types.ts";

export class BotWebSocket {
  #ws: WebSocket | null = null;
  #defs: Record<string, Deferred<CqResponseData["data"]>> = {};
  api: BotApi = new Proxy(
    {},
    {
      get: (_target, action) => (params: unknown) => {
        const echo = crypto.randomUUID();
        if (this.#ws) {
          this.#ws.send(JSON.stringify({ action, params, echo }));
          this.#defs[echo] = deferred();
          return this.#defs[echo];
        }
      },
    }
  );

  constructor(private bus: BotEventBus) {}

  connect() {
    this.#ws = new WebSocket(config.url);
    this.#ws.onopen = () => log.info(`WebSocket 连接成功(${config.url})`);
    this.#ws.onmessage = this.onMessage.bind(this);
    this.#ws.onclose = () => {
      log.warning(`WebSocket 已关闭，将在 10 秒后重连`);
      setTimeout(() => {
        log.info(`WebSocket 正在尝试重连(${config.url})...`);
        this.connect();
      }, 10000);
    };
    this.#ws.onerror = (e) =>
      log.error(`WebSocket 错误: ${(e as ErrorEvent).message}`);
  }

  async onMessage(event: MessageEvent) {
    const res: CqData = JSON.parse(event.data);

    if (res.echo) {
      if (res.retcode === 0) {
        this.#defs[res.echo].resolve(res.data);
      } else {
        this.#defs[res.echo].reject(res.data);
        log.error(res);
      }
      delete this.#defs[res.echo];
      return;
    }

    if (!("post_type" in res)) return;
    if (res.post_type === "meta_event") return;
    if (res.group_id && !config.groups.includes(res.group_id)) return;

    const postType = res.post_type;
    const type = postType.startsWith("message")
      ? res.message_type
      : res[`${postType}_type`];
    const subType = res.sub_type;
    const subSubType = res.honor_type;

    const botEvent = new BotEvent(res, this.api);

    const { bus } = this;
    await bus.emit(`${postType}`, botEvent);
    await bus.emit(`${postType}.${type}`, botEvent);
    if (subType) await bus.emit(`${postType}.${type}.${subType}`, botEvent);
    if (subSubType)
      await bus.emit(`${postType}.${type}.${subType}.${subSubType}`, botEvent);
  }
}
