// deno-lint-ignore-file camelcase
import type { BotEvent } from "./BotEvent.ts";

export type MessageFilter = Partial<{
  pattern: RegExp;
  at: boolean;
  admin: boolean;
  image: boolean;
}>;

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
