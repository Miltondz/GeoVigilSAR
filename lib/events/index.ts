import type { EventConfig } from './ven-2406'
import { VEN_2406 } from './ven-2406'
import { TUR_2302 } from './tur-2302'

export type { EventConfig }
export { VEN_2406, TUR_2302 }

export const EVENT_REGISTRY: Record<string, EventConfig> = {
  'VEN-2406': VEN_2406,
  'TUR-2302': TUR_2302,
}

export function getEvent(id: string): EventConfig {
  return EVENT_REGISTRY[id] ?? VEN_2406
}

export const ACTIVE_EVENTS = Object.values(EVENT_REGISTRY).filter(e => e.status === 'active')
export const ARCHIVE_EVENTS = Object.values(EVENT_REGISTRY).filter(e => e.status === 'archive')
