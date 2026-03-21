import { inspect } from 'node:util';
import { isPrimitive } from '@zokugun/is-it-type';
import vscode, { window } from 'vscode';
import { CONFIG_KEY, EXTENSION_NAME } from './settings.js';

let $channel: vscode.OutputChannel | null = null;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Logger = {
	debug(...args: unknown[]): void {
		$channel?.appendLine(`[debug] ${args.map(toString).join(' ')}`);
	},
	error(...args: unknown[]): void {
		const config = vscode.workspace.getConfiguration(CONFIG_KEY);
		const showErrorAlert = config.get<boolean>('showErrorAlert') ?? true;

		if(Boolean($channel) || showErrorAlert) {
			const output = args.map(toString).join(' ');

			$channel?.appendLine(`[error] ${output}`);

			if(showErrorAlert) {
				void window.showErrorMessage(`${EXTENSION_NAME}: ${output}`);
			}
		}
	},
	info(...args: unknown[]): void {
		$channel?.appendLine(`[info] ${args.map(toString).join(' ')}`);
	},
	setup(show: boolean = false): void {
		$channel = vscode.window.createOutputChannel(EXTENSION_NAME);

		if(show) {
			$channel.show();
		}
	},
	show(): void {
		$channel?.show();
	},
};

function toString(value: unknown): string {
	if(isPrimitive(value)) {
		return `${value}`;
	}
	else {
		return inspect(value, { depth: null, compact: true, breakLength: Infinity });
	}
}
