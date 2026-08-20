import type { WorkspaceConfiguration } from 'vscode';

export function getIgnoredSettings(config: WorkspaceConfiguration): string[] {
	const ignoredSettings = config.get<string[]>('ignoredSettings') ?? [];

	return ignoredSettings.filter((value) => !value.startsWith('syncSettings'));
}
