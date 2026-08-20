import type { ITask } from './types';

import { Delayer } from './delayer.js';
import { Throttler } from './throttler.js';
import { unsafeCast } from '../unsafe-cast.js';

export class ThrottledDelayer<T> {
	private readonly delayer: Delayer<Promise<T>>;
	private readonly throttler: Throttler<T>;

	public constructor(defaultDelay: number) {
		this.delayer = new Delayer(defaultDelay);
		this.throttler = new Throttler();
	}

	public cancel(): void {
		this.delayer.cancel();
	}

	public dispose(): void {
		this.delayer.dispose();
	}

	public isTriggered(): boolean {
		return this.delayer.isTriggered();
	}

	public async trigger(promiseFactory: ITask<Promise<T>>, delay?: number): Promise<T> {
		return unsafeCast<Promise<T>>(this.delayer.trigger(async () => this.throttler.queue(promiseFactory), delay));
	}
}
