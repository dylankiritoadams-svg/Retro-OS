type EventHandler = (data?: any) => void;

class EventEmitter {
    private events: Record<string, EventHandler[]> = {};

    subscribe(eventName: string, handler: EventHandler) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(handler);
    }

    unsubscribe(eventName: string, handler: EventHandler) {
        if (!this.events[eventName]) {
            return;
        }
        this.events[eventName] = this.events[eventName].filter(h => h !== handler);
    }

    emit(eventName: string, data?: any) {
        if (!this.events[eventName]) {
            return;
        }
        this.events[eventName].forEach(handler => handler(data));
    }
}

export const globalEmitter = new EventEmitter();