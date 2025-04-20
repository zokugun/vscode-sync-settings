export type ITask<T> = {
	// eslint-disable-next-line @typescript-eslint/prefer-function-type
	(): T;
};

const canceledName = 'Canceled';

export function canceled(): Error {
	const error = new Error(canceledName);
	error.name = error.message;
	return error;
}

export class Delayer<T> {
	private timeout: NodeJS.Timeout | null;
	private completionPromise: Promise<any> | null;
	private doResolve: ((value?: any | Promise<any>) => void) | null;
	private doReject: ((error: any) => void) | null;
	private task: ITask<T | Promise<T>> | null;

	constructor(public defaultDelay: number) {
		this.timeout = null;
		this.completionPromise = null;
		this.doResolve = null;
		this.doReject = null;
		this.task = null;
	}

	async trigger(task: ITask<T | Promise<T>>, delay: number = this.defaultDelay): Promise<T> {
		this.task = task;
		this.cancelTimeout();

		this.completionPromise ||= new Promise((resolve, reject) => {
			this.doResolve = resolve;
			this.doReject = reject;
		}).then(async () => {
			this.completionPromise = null;
			this.doResolve = null;
			if(this.task) {
				const task = this.task;
				this.task = null;
				return task();
			}

			return undefined;
		});

		this.timeout = setTimeout(() => {
			this.timeout = null;
			if(this.doResolve) {
				this.doResolve(null);
			}
		}, delay);

		return this.completionPromise as Promise<T>;
	}

	isTriggered(): boolean {
		return this.timeout !== null;
	}

	cancel(): void {
		this.cancelTimeout();

		if(this.completionPromise) {
			if(this.doReject) {
				this.doReject(canceled());
			}

			this.completionPromise = null;
		}
	}

	dispose(): void {
		this.cancel();
	}

	private cancelTimeout(): void {
		if(this.timeout !== null) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}
}

export class Throttler {
	private activePromise: Promise<any> | null;
	private queuedPromise: Promise<any> | null;
	private queuedPromiseFactory: ITask<Promise<any>> | null;

	constructor() {
		this.activePromise = null;
		this.queuedPromise = null;
		this.queuedPromiseFactory = null;
	}

	async queue<T>(promiseFactory: ITask<Promise<T>>): Promise<T> {
		if(this.activePromise) {
			this.queuedPromiseFactory = promiseFactory;

			if(!this.queuedPromise) {
				const onComplete = async () => {
					this.queuedPromise = null;

					const result = this.queue(this.queuedPromiseFactory!);
					this.queuedPromiseFactory = null;

					return result;
				};

				this.queuedPromise = new Promise((resolve) => {
					void this.activePromise!.then(onComplete, onComplete).then(resolve);
				});
			}

			return new Promise((resolve, reject) => {
				this.queuedPromise!.then(resolve, reject);
			});
		}

		this.activePromise = promiseFactory();

		return new Promise((resolve, reject) => {
			this.activePromise!.then((result: T) => {
				this.activePromise = null;
				resolve(result);
			}, (error: unknown) => {
				this.activePromise = null;
				reject(error);
			});
		});
	}
}

export class ThrottledDelayer<T> {
	private readonly delayer: Delayer<Promise<T>>;
	private readonly throttler: Throttler;

	constructor(defaultDelay: number) {
		this.delayer = new Delayer(defaultDelay);
		this.throttler = new Throttler();
	}

	async trigger(promiseFactory: ITask<Promise<T>>, delay?: number): Promise<T> {
		return this.delayer.trigger(async () => this.throttler.queue(promiseFactory), delay) as unknown as Promise<T>;
	}

	isTriggered(): boolean {
		return this.delayer.isTriggered();
	}

	cancel(): void {
		this.delayer.cancel();
	}

	dispose(): void {
		this.delayer.dispose();
	}
}
