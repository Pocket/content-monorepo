import { CuratedCorpusEventEmitter } from './curatedCorpusEventEmitter';
import { CuratedCorpusEventHandlerFn } from './eventHandlers';

// Init the event emitter
export const curatedCorpusEventEmitter = new CuratedCorpusEventEmitter();

export function initItemEventHandlers(
  emitter: CuratedCorpusEventEmitter,
  handlers: CuratedCorpusEventHandlerFn[]
) {
  handlers.forEach((handler) => handler(emitter));
}
