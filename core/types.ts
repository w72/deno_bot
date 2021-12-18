// deno-lint-ignore-file camelcase
import type { BotEvent } from "./BotEvent.ts";

export interface MessageFilter {
  at?: boolean;
  admin?: boolean;
  image?: boolean;
  pattern?: RegExp;
}

export interface BotEventListener {
  app: string;
  listen: string;
  filter: MessageFilter;
  handler: (e: BotEvent) => Promise<void> | void;
}

export interface BotCronListener {
  app: string;
  cron: string;
  handler: () => Promise<void> | void;
}

export type BotListener = BotEventListener | BotCronListener;

export interface CqMessageSegmentImageData {
  file: string;
  type?: "flash";
  url: string;
}

export interface CqMessageSegment {
  type: string;
  data: Record<string, any>;
}

export interface CqEventData {
  time: number;
  self_id: number;
  post_type: string;
  message_type: string;
  message: CqMessageSegment[];
  user_id: number;
  group_id: number;
  sub_type: string;
  honor_type: string;
  raw_message: string;
  [key: string]: any;
}

export interface CqResponseData {
  data: unknown;
  status: string;
  echo: string;
  retcode: number;
}

export type CqData = CqEventData | CqResponseData;

export type BotMessage =
  | undefined
  | string
  | Uint8Array
  | CqMessageSegment
  | (string | Uint8Array | CqMessageSegment | undefined | false)[];

export interface BotApi {
  [key: string]: (params: Record<string, any>) => Promise<any>;
}

export interface BotConfig {
  [key: string]: any;
}
