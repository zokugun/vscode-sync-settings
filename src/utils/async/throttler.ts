import type { ITask } from './types';

import { isError, isObjectLike } from '@zokugun/is-it-type';

export class Throttler<T> {
	private activePromise: Promise<T> | null;
	private queuedPromise: Promise<T> | null;

	public constructor() {
		this.activePromise = null;
		this.queuedPromise = null;
	}

	public async queue(promiseFactory: ITask<Promise<T>>): Promise<T> {
		if(this.activePromise) {
			if(!this.queuedPromise) {
				const onComplete = async (): Promise<T> => {
					this.queuedPromise = null;

					return this.queue(promiseFactory);
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
				reject(isError(error) ? error : new Error(isObjectLike(error) ? error.toString() : String(error)));
			});
		});
	}
}
