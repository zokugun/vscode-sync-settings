import vscode from 'vscode';
import { Logger } from '../utils/logger';
import { reset as doReset } from '../utils/reset';

export async function reset(): Promise<void> {
	try {
		const result = await vscode.window.showWarningMessage(
			'Do you really want to remove all your actual settings and your actual extensions?',
			{ modal: true },
			{ title: 'Yes' },
		);

		if(result) {
			const result = await vscode.window.showWarningMessage(
				'Are you sure?',
				{ modal: true },
				{ title: 'Yes' },
			);

			if(result) {
				await doReset();
			}
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
