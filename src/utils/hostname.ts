import * as os from 'os';
import { type WorkspaceConfiguration } from 'vscode';
import { formatter } from './formatter.js';

export function hostname(config: WorkspaceConfiguration): string {
	const format = config.get<string>('hostname') ?? '';

	if(format.length === 0) {
		return format;
	}
	else {
		return formatter(format, {
			hostname: os.hostname(),
			username: os.userInfo().username,
		});
	}
}
