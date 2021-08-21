import { window } from 'vscode';

const channel = window.createOutputChannel('Sync Settings');

export const Logger = {
	error(...args: any[]): void {
		channel.appendLine(`[error] ${args.join(' ')}`);
	},
	info(...args: any[]): void {
		channel.appendLine(`[info] ${args.join(' ')}`);
	},
	show(): void {
		channel.show();
	},
};
