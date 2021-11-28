// deno-lint-ignore-file camelcase no-explicit-any
import { Reflect } from "reflect_metadata";
import { cron } from "deno_cron";
import { deferred, Deferred } from "std/async/mod.ts";
import { parse } from "std/encoding/yaml.ts";
import { encode } from "std/encoding/base64.ts";
import * as log from "std/log/mod.ts";
import * as path from "std/path/mod.ts";

interface CqMessageSegment {
  type: string;
  data: Record<string, any>;
}

interface CqEventData {
  time: number;
  self_id: number;
  post_type: string;
  message_type: string;
  message: CqMessageSegment[];
  group_id: number;
  sub_type: string;
  honor_type: string;
  raw_message: string;
  [key: string]: any;
}

interface CqResponseData {
  data: unknown;
  status: string;
  echo: string;
  retcode: number;
}

type CqData = CqEventData | CqResponseData;

interface BotEventListener {
  app: string;
  listen: string;
  filter: MessageFilter;
  handler: (e: BotEvent) => void;
}

interface BotCronListener {
  app: string;
  cron: string;
  handler: () => Promise<void> | void;
}

type BotListener = BotEventListener | BotCronListener;

type MessageFilter = Partial<{
  pattern: RegExp;
  at: boolean;
  admin: boolean;
  image: boolean;
}>;

type BotMessage =
  | undefined
  | string
  | Uint8Array
  | CqMessageSegment
  | (string | Uint8Array | CqMessageSegment | undefined | false)[];

export const rootPath = path.dirname(path.fromFileUrl(import.meta.url));
const appsPath = path.join(rootPath, "apps");
const configPath = path.join(rootPath, "config.yml");
const configFile = await Deno.readTextFile(configPath);
export const config = parse(configFile) as Record<string, any>;

export function listen(str: string): MethodDecorator {
  return (target, key) => Reflect.defineMetadata("listen", str, target, key);
}

function filter(options: MessageFilter): MethodDecorator;
function filter(pattern: RegExp, options?: MessageFilter): MethodDecorator;
function filter(a: RegExp | MessageFilter, b?: MessageFilter): MethodDecorator {
  const [pattern, options] = a instanceof RegExp ? [a, b] : [null, a];
  return (target, key) =>
    Reflect.defineMetadata("filter", { pattern, ...options }, target, key);
}
export { filter };

export function name(str: string): MethodDecorator {
  return (target, key) => Reflect.defineMetadata("name", str, target, key);
}

export function description(str: string): MethodDecorator {
  return (target, key) =>
    Reflect.defineMetadata("description", str, target, key);
}

export function cqMessage(msg: BotMessage): CqMessageSegment[] {
  if (!msg) return [];
  return (Array.isArray(msg) ? msg : [msg])
    .filter((v): v is string | Uint8Array | CqMessageSegment => Boolean(v))
    .map((v) =>
      typeof v === "string"
        ? { type: "text", data: { text: v } }
        : v instanceof Uint8Array
        ? { type: "image", data: { file: `base64://${encode(v)}` } }
        : v
    );
}

export class BotApp {
  name = "";
  description = "";
  log = log;
  state: Record<string, any> = {};
  config: Record<string, any>;
  assetPath: string;
  constructor(public key: string, public api: BotWebSocket["api"]) {
    this.config = config.apps?.[key] ?? {};
    this.assetPath = path.join(rootPath, "assets", key);
  }
  asset(...paths: string[]) {
    return path.join(this.assetPath, ...paths);
  }
  init(): Promise<void> | void {}
}

export class BotEvent {
  cmd = "";
  at = false;
  admin = false;
  image = false;
  match = {} as RegExpExecArray;
  constructor(public data: CqEventData, public api: BotWebSocket["api"]) {
    this.admin = config.admins.includes(data.user_id);
    if (data.message) {
      this.at = true;
      this.image = Boolean(data.message.find((v) => v.type === "image")?.data);
      let cmd = data.message
        .filter((v) => v.type === "text")
        .map((v) => v.data.text.trim())
        .join("");
      if (data.message_type === "group") {
        const name = config.names.find((v: string) =>
          cmd.toLowerCase().startsWith(v.toLowerCase())
        );
        if (name) cmd = cmd.slice(name.length).trim();
        const isAtMe = data.message.some(
          (v) => v.type === "at" && v.data.qq === String(data.self_id)
        );
        this.at = isAtMe || Boolean(name);
      }
      this.cmd = cmd;
    }
  }

  operation(operation: any): Promise<any> {
    const data = { context: this.data, operation };
    return this.api[".handle_quick_operation"](data);
  }

  reply(msg: BotMessage, args: Record<string, any> = {}): Promise<any> | void {
    if (!msg) return;
    return this.operation({ reply: cqMessage(msg), ...args });
  }
}

class BotEventBus {
  #listeners: BotEventListener[] = [];
  async emit(name: string, e: BotEvent) {
    for (const { app, filter, listen, handler } of this.#listeners) {
      if (e.data.message) {
        const { at, image, admin, pattern } = filter;
        if (listen !== name) continue;
        if (at && !e.at) continue;
        if (image && !e.image) continue;
        if (admin && !e.admin) continue;
        if (pattern) {
          const match = pattern.exec(e.cmd);
          if (!match) continue;
          e.match = match;
        }
      }
      try {
        await handler(e);
      } catch (e) {
        log.error(`${app}发生了错误：`);
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

class BotWebSocket {
  #ws: WebSocket | null = null;
  #defs: Record<string, Deferred<CqResponseData["data"]>> = {};
  api: Record<string, any> = new Proxy(
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
      const indexPath = path.join(rootPath, "apps", v.name, "index.ts");
      await import(path.toFileUrl(indexPath).href)
        .then((res) => {
          const App: typeof BotApp | undefined = res.default;
          if (App) this.modules[v.name] = App;
          else log.warning(`应用加载失败：${v.name} 无默认导出`);
        })
        .catch((err) => {
          log.warning(`应用加载失败：${v.name}`);
          log.warning(err);
        });
    }

    const botEventBus = new BotEventBus();
    const botWebSocket = new BotWebSocket(botEventBus);

    for (const [key, App] of Object.entries(this.modules)) {
      this.apps.push(new App(key, botWebSocket.api));
    }

    for (const app of this.apps) {
      await app.init();
      log.info(`已加载应用 ${app.key}${app.name ? ` - ${app.name}` : ""}`);
      const metadata = BotAppManager.getMetadata(app);
      for (const v of metadata) {
        if ("listen" in v) botEventBus.listen(v);
        if ("cron" in v) cron(v.cron, v.handler);
      }
    }

    botWebSocket.connect();
  }
}
