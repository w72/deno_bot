import { config, cqMessage } from "./utils.ts";
import type {
  BotApi,
  BotMessage,
  CqEventData,
  CqMessageSegmentImageData,
} from "./types.ts";

export class BotEvent {
  cmd = "";
  at = false;
  admin = false;
  image: CqMessageSegmentImageData | undefined;
  match = {} as RegExpExecArray;

  constructor(public data: CqEventData, public api: BotApi) {
    this.admin = config.admins.includes(data.user_id);
    if (data.message) {
      this.at = true;
      this.image = data.message.find((v) => v.type === "image")
        ?.data as CqMessageSegmentImageData;
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

  operation(operation: Record<string, unknown>): Promise<void> {
    const data = { context: this.data, operation };
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
