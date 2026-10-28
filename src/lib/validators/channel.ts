import "server-only";
import type { Channel } from "@/models/channel";
import { id, obj, str, txnType } from "./shared";

export function parseChannel(value: unknown): Channel {
  const v = obj(value, "channel");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
    type: txnType(v.type),
  };
}
