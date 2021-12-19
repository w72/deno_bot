import { config, cqMessage } from "./utils.ts";
import type {
  BotApi,
  BotMessage,
  CqEventData,
  CqMessageImageSegment,
} from "./types.ts";

export class BotEvent {
  cmd = "";
  at = false;
  admin = false;
  image: CqMessageImageSegment["data"] | undefined;
  match = {} as RegExpExecArray;

  constructor(public target: CqEventData, public api: BotApi) {
    this.admin = config.admins.includes(target.user_id);
    if (target.message) {
      this.at = true;
      this.image = target.message.find(
        (v): v is CqMessageImageSegment => v.type === "image"
      )?.data;
      let cmd = target.message
        .filter((v) => v.type === "text")
        .map((v) => v.data.text.trim())
        .join("");
      if (target.message_type === "group") {
        const name = config.names.find((v: string) =>
          cmd.toLowerCase().startsWith(v.toLowerCase())
        );
        if (name) cmd = cmd.slice(name.length).trim();
        const isAtMe = target.message.some(
          (v) => v.type === "at" && v.data.qq === String(target.self_id)
        );
        this.at = isAtMe || Boolean(name);
      }
      this.cmd = cmd;
    }
  }

  operation(operation: Record<string, unknown>): Promise<void> {
    const data = { context: this.target, operation };
    return this.api[".handle_quick_operation"](data);
  }

  reply(
    msg: BotMessage,
    args: Record<string, unknown> = {}
  ): Promise<void> | void {
    if (!msg) return;
    return this.operation({ reply: cqMessage(msg), ...args });
  }
}
