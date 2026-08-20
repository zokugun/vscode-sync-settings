import { inspect } from 'node:util';
import { isPrimitive } from '@zokugun/is-it-type';
import vscode, { window } from 'vscode';

import { CONFIG_KEY, EXTENSION_NAME } from './settings.js';

export namespace Logger {
	let $channel: vscode.OutputChannel | null = null;

	export function debug(...args: unknown[]): void {
		$channel?.appendLine(`[debug] ${args.map(toString).join(' ')}`);
	}

	export function error(...args: unknown[]): void {
		const config = vscode.workspace.getConfiguration(CONFIG_KEY);
		const showErrorAlert = config.get<boolean>('showErrorAlert') ?? true;

		if(Boolean($channel) || showErrorAlert) {
			const output = args.map(toString).join(' ');

			$channel?.appendLine(`[error] ${output}`);

			if(showErrorAlert) {
				void window.showErrorMessage(`${EXTENSION_NAME}: ${output}`);
			}
		}
	}

	export function info(...args: unknown[]): void {
		$channel?.appendLine(`[info] ${args.map(toString).join(' ')}`);
	}

	export function setup(show: boolean = false): void {
		$channel = vscode.window.createOutputChannel(EXTENSION_NAME);

		if(show) {
			$channel.show();
		}
	}

	export function show(): void {
		$channel?.show();
	}
}

function toString(value: unknown): string {
	if(isPrimitive(value)) {
		return `${value}`;
	}
	else {
		return inspect(value, { breakLength: Infinity, compact: true, depth: null });
	}
}
