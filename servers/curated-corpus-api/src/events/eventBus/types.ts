import { BaseEventData, BaseEventBusPayload } from '../types';

export type EventHandlerCallbackMap = {
  [key in BaseEventData['eventType']]?: (data: any) => BaseEventBusPayload;
};
