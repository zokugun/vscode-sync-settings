import type { ITask } from './types';

export class Delayer<T> {
	public readonly defaultDelay: number;

	private completionPromise: Promise<T | undefined> | null;
	private doReject: ((error: unknown) => void) | null;
	private doResolve: ((value?: unknown) => void) | null;
	private task: ITask<Promise<T> | T> | null;
	private timeout: NodeJS.Timeout | null;

	public constructor(defaultDelay: number) {
		this.defaultDelay = defaultDelay;
		this.timeout = null;
		this.completionPromise = null;
		this.doResolve = null;
		this.doReject = null;
		this.task = null;
	}

	public cancel(): void {
		this.cancelTimeout();

		if(this.completionPromise) {
			if(this.doReject) {
				this.doReject(canceled());
			}

			this.completionPromise = null;
		}
	}

	public dispose(): void {
		this.cancel();
	}

	public isTriggered(): boolean {
		return this.timeout !== null;
	}

	public async trigger(task: ITask<Promise<T> | T>, delay: number = this.defaultDelay): Promise<T | undefined> {
		this.task = task;
		this.cancelTimeout();

		this.completionPromise ??= new Promise((resolve, reject) => {
			this.doResolve = resolve;
			this.doReject = reject;
		}).then(async () => {
			this.completionPromise = null;
			this.doResolve = null;

			if(this.task) {
				const { task } = this;
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

		return this.completionPromise;
	}

	private cancelTimeout(): void {
		if(this.timeout !== null) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}
}

const canceledName = 'Canceled';

function canceled(): Error {
	const error = new Error(canceledName);
	error.name = error.message;
	return error;
}

