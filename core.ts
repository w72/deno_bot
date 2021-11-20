import { Reflect } from "reflect_metadata";

import { deferred, Deferred } from "std/async/mod.ts";
import { parse } from "std/encoding/yaml.ts";
import { fromFileUrl, toFileUrl, dirname, join } from "std/path/mod.ts";
import { exists } from "std/fs/mod.ts";
import * as log from "std/log/mod.ts";

interface CqMessageSegment {
  type: string;
  data: Record<string, any>;
}

interface CqEventData {
  time: number;
  self_id: number;
  post_type: string;
  message_type?: string;
  message?: CqMessageSegment[];
  group_id?: number;
  sub_type?: string;
  honor_type?: string;
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
  handler: (e: BotEvent) => Promise<void> | void;
}

interface BotCronListener {
  app: string;
  cron: string;
  handler: (e: BotEvent) => Promise<void> | void;
}

type BotListener = BotEventListener | BotCronListener;

export type MessageFilter = Partial<{
  pattern: RegExp;
  at: boolean;
  admin: boolean;
  image: boolean;
}>;

export const rootPath = dirname(fromFileUrl(import.meta.url));
const appsPath = join(rootPath, "apps");
const configPath = join(rootPath, "config.yml");
const configFile = await Deno.readTextFile(configPath);
export const config = parse(configFile) as Record<string, any>;

export function listen(name: string): MethodDecorator {
  return (target, key) => Reflect.defineMetadata("listen", name, target, key);
}

function filter(options: MessageFilter): MethodDecorator;
function filter(pattern: RegExp, options?: MessageFilter): MethodDecorator;
function filter(a: RegExp | MessageFilter, b?: MessageFilter): MethodDecorator {
  const [pattern, options] = a instanceof RegExp ? [a, b] : [null, b];
  return (target, key) =>
    Reflect.defineMetadata("filter", { pattern, ...options }, target, key);
}
export { filter };

export abstract class BotApp {
  key = crypto.randomUUID();
  name = this.key;
  description = "";
  log = log;
  config: any;
  assets: any;
  init(): Promise<void> | void {}
}

export class BotEvent {
  match: string[] = [];
  cmd = "";
  at = false;
  admin = false;
  image = false;
  constructor(public data: CqEventData, public bot: BotWs) {
    this.admin = config.admins.includes(data.user_id);
    if (data.post_type.startsWith("message") && data.message) {
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
    return this.bot.api[".handle_quick_operation"](data);
  }

  reply(
    msg: string | CqMessageSegment | (string | CqMessageSegment)[],
    args: Record<string, any> = {}
  ): Promise<any> | void {
    if (!msg) return;
    if (this.data.message_type !== "group") args.at_sender = false;
    const reply =
      typeof msg === "string"
        ? msg
        : Array.isArray(msg)
        ? msg.map((v) =>
            typeof v === "string" ? { type: "text", data: { text: v } } : v
          )
        : [msg];
    return this.operation({ reply, ...args });
  }
}

export class BotWs {
  api: Record<string, any> = new Proxy({} as Record<string, unknown>, {
    get: (_target, action) => (params: unknown) => {
      const echo = crypto.randomUUID();
      if (this.#ws) {
        this.#ws.send(JSON.stringify({ action, params, echo }));
        this.#defs[echo] = deferred();
        return this.#defs[echo];
      }
    },
  });
  #ws: WebSocket | null = null;
  #defs: Record<string, Deferred<CqResponseData["data"]>> = {};
  #listeners: BotEventListener[] = [];

  connect(): Promise<void> {
    const openWs = deferred<void>();
    this.#ws = new WebSocket(config.url);
    this.#ws.onopen = () => openWs.resolve();
    this.#ws.onmessage = this.onMessage.bind(this);
    this.#ws.onclose = () => console.log("[ERROR] ws closed");
    return openWs;
  }

  async onMessage(event: MessageEvent) {
    const res: CqData = JSON.parse(event.data);

    if (res.echo) {
      if (res.retcode === 0) {
        this.#defs[res.echo].resolve(res.data);
      } else {
        this.#defs[res.echo].reject(res.data);
        console.error("%o", res);
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

    const botEvent = new BotEvent(res, this);

    await this.emit(`${postType}`, botEvent);
    await this.emit(`${postType}.${type}`, botEvent);
    if (subType) await this.emit(`${postType}.${type}.${subType}`, botEvent);
    if (subSubType)
      await this.emit(`${postType}.${type}.${subType}.${subSubType}`, botEvent);
  }

  async emit(name: string, e: BotEvent) {
    for (const { filter, listen, handler } of this.#listeners) {
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
      await handler(e);
    }
  }

  listen(event: BotEventListener) {
    this.#listeners.push(event);
  }

  remove(app: string) {
    this.#listeners = this.#listeners.filter((v) => v.app !== app);
  }
}

export class BotAppManager {
  apps: BotApp[] = [];

  async loadApps() {
    const appMainFiles = [];
    for await (const item of Deno.readDir(appsPath)) {
      if (item.isFile) appMainFiles.push(item.name);
      if (item.isDirectory) appMainFiles.push(join(item.name, "index.ts"));
    }

    for (const appMainFile of appMainFiles) {
      const appPath = join(rootPath, "apps", appMainFile);
      if (!(await exists(appPath))) continue;
      const appModule = await import(toFileUrl(appPath).href);
      const App = appModule.default;
      if (!App) continue;
      const appIns: BotApp = new App();
      appIns.config = config.apps?.[appIns.key];
      this.apps.push(appIns);
      await appIns.init?.();
      console.log(`[INFO] 已加载应用 ${appIns.key}`);
    }
  }

  async run() {
    const botWs = new BotWs();
    await botWs.connect();
    await this.loadApps();
    for (const app of this.apps) {
      const metadata = BotAppManager.getMetadata(app);
      for (const item of metadata) {
        if ("listen" in item) botWs.listen(item);
      }
    }
  }

  static getMetadata(ins: BotApp): BotListener[] {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(ins))
      .map((v): BotListener | null => {
        if (v === "constructor") return null;
        const fn = (ins as any)[v];
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
}
