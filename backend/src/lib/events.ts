import { EventEmitter } from "events";
import type { DebateEvent } from "../types.js";

// One event bus per debate — keyed by debateId
const debateBuses = new Map<string, EventEmitter>();

export function getDebateBus(debateId: string): EventEmitter {
  let bus = debateBuses.get(debateId);
  if (!bus) {
    bus = new EventEmitter();
    bus.setMaxListeners(50);
    debateBuses.set(debateId, bus);
  }
  return bus;
}

export function emitDebateEvent(debateId: string, event: DebateEvent): void {
  const bus = getDebateBus(debateId);
  bus.emit("debate-event", event);
}

export function cleanupDebateBus(debateId: string): void {
  const bus = debateBuses.get(debateId);
  if (bus) {
    bus.removeAllListeners();
    debateBuses.delete(debateId);
  }
}
