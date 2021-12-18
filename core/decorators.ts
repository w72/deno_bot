import { Reflect } from "reflect_metadata";
import type { MessageFilter } from "./types.ts";

export function listen(str: string): MethodDecorator {
  return (target, key) => Reflect.defineMetadata("listen", str, target, key);
}

export function filter(options: MessageFilter): MethodDecorator;
export function filter(
  pattern: RegExp,
  options?: MessageFilter
): MethodDecorator;
export function filter(
  a: RegExp | MessageFilter,
  b?: MessageFilter
): MethodDecorator {
  const [pattern, options] = a instanceof RegExp ? [a, b] : [null, a];
  return (target, key) =>
    Reflect.defineMetadata("filter", { pattern, ...options }, target, key);
}

export function cron(str: string): MethodDecorator {
  return (target, key) => Reflect.defineMetadata("cron", str, target, key);
}

export function name(str: string): MethodDecorator {
  return (target, key) => Reflect.defineMetadata("name", str, target, key);
}

export function description(str: string): MethodDecorator {
  return (target, key) =>
    Reflect.defineMetadata("description", str, target, key);
}
