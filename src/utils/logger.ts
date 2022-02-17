import vscode, { window } from 'vscode';

const channel = window.createOutputChannel('Sync Settings');

export const Logger = {
	error(...args: any[]): void {
		channel.appendLine(`[error] ${args.join(' ')}`);

		const config = vscode.workspace.getConfiguration('syncSettings');
		const showErrorAlert = config.get<boolean>('showErrorAlert') ?? true;

		if(showErrorAlert) {
			void window.showErrorMessage(`Sync Settings: ${args.join(' ')}`);
		}
	},
	info(...args: any[]): void {
		channel.appendLine(`[info] ${args.join(' ')}`);
	},
	show(): void {
		channel.show();
	},
};
