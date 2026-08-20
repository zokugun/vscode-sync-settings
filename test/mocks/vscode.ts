import type { OutputChannel } from 'vscode';

import { isArray, isString } from '@zokugun/is-it-type';
import { transform } from '@zokugun/jsonc-preprocessor';
import * as JSONC from 'jsonc-parser';
import { vol } from 'memfs';
import yaml from 'yaml';

import { Uri } from './vscode/uri.js';
import { unsafeCast } from '../../src/utils/unsafe-cast.js';

type Extension = {
	id: string;
	packageJSON: {
		isBuiltin: boolean;
		isUnderDevelopment: boolean;
		uuid: string;
	};
};

const $executedCommands: string[] = [];
const $extensions: string[] = [];
let $manageExtensions = true;
const $managedExtensions: string[] = [];
const $outputLines: string[] = [];

const $outputChannel = {
	appendLine: (value: string): void => {
		$outputLines.push(value);
	},
	show: (): void => {},
};

let $platform = 'linux';

const $process = {
	get platform(): string {
		return $platform;
	},
};

let $settings: Record<string, unknown> = {};

const $vscode = {
	commands: {
		executeCommand(command: string, ...args: unknown[]): void { // {{{
			$executedCommands.push(command);

			if(command === 'workbench.extensions.disableExtension') {
				const id = unsafeCast<string>(args[0]);

				for(const [index, extension] of $vscode.extensions.all.entries()) {
					if(extension.id === id) {
						$vscode.extensions.all.splice(index, 1);

						break;
					}
				}
			}
			else if(command === 'workbench.extensions.enableExtension') {
				const id = unsafeCast<string>(args[0]);

				if(!$vscode.extensions.all.some((extension) => extension.id === id)) {
					$vscode.extensions.all.push({
						id,
						packageJSON: {
							isBuiltin: false,
							isUnderDevelopment: false,
							uuid: '00000000-0000-0000-0000-000000000000',
						},
					});
				}
			}
			else if(command === 'workbench.extensions.installExtension') {
				const id = unsafeCast<string>(args[0]);

				if($vscode.extensions.all.some((extension) => extension.id === id)) {
					return;
				}

				if($extensions.includes(id)) {
					$vscode.extensions.all.push({
						id,
						packageJSON: {
							isBuiltin: false,
							isUnderDevelopment: false,
							uuid: '00000000-0000-0000-0000-000000000000',
						},
					});
				}
				else {
					$vscode.extensions.all.push({
						id,
						packageJSON: {
							isBuiltin: false,
							isUnderDevelopment: false,
							uuid: '00000000-0000-0000-0000-000000000000',
						},
					});

					const dots = id.split('.');

					vol.mkdirSync(`/.vscode/extensions/${id}-0.0.0`, { recursive: true });
					vol.writeFileSync(`/.vscode/extensions/${id}-0.0.0/package.json`, JSON.stringify({
						name: dots[1],
						publisher: dots[0],
						version: '0.0.0',
						__metadata: {
							id: '00000000-0000-0000-0000-000000000000',
						},
					}), {
						encoding: 'utf8',
					});

					$extensions.push(id);
				}
			}
			else if(command === 'workbench.extensions.uninstallExtension') {
				const id = unsafeCast<string>(args[0]);

				const index = $extensions.indexOf(id);

				if(index === -1) {
					throw new Error(`Extension '${id}' is not installed. Make sure you use the full extension ID, including the publisher, e.g.: ms-dotnettools.csharp.`);
				}

				for(const [index, extension] of $vscode.extensions.all.entries()) {
					if(extension.id === id) {
						$vscode.extensions.all.splice(index, 1);

						break;
					}
				}

				const dir = `/.vscode/extensions/${id}-0.0.0`;

				if(vol.existsSync(dir)) {
					vol.rmdirSync(dir, { recursive: true });
				}

				$extensions.splice(index, 1);
			}
		}, // }}}
		getCommands(): string[] {
			if($manageExtensions) {
				return [
					'workbench.action.reloadWindow',
					'workbench.extensions.disableExtension',
					'workbench.extensions.enableExtension',
					'workbench.extensions.installExtension',
					'workbench.extensions.uninstallExtension',
				];
			}
			else {
				return [
					'workbench.action.reloadWindow',
					'workbench.extensions.installExtension',
					'workbench.extensions.uninstallExtension',
				];
			}
		},
	},
	DiagnosticSeverity: {
		Error: 0,
		Hint: 3,
		Information: 2,
		Warning: 1,
	},
	env: {
		appName: 'vscode',
		appRoot: '/app',
	},
	ExtensionKind: {
		UI: 1,
		Workspace: 2,
	},
	extensions: {
		all: [] as Extension[],
		getExtension(name: string): unknown {
			if(name === 'zokugun.vsix-manager') {
				return {
					exports: {
						installExtensions: (): void => {},
						listManagedExtensions: (): string[] => $managedExtensions,
					},
				};
			}
			else {
				return null;
			}
		},
	},
	ProgressLocation: {
		Notification: 0,
	},
	Uri,
	version: '1.0.0',
	window: {
		createOutputChannel: (): Partial<OutputChannel> => $outputChannel,
		showErrorMessage: (): undefined => undefined,
		showInformationMessage: (): undefined => undefined,
		showQuickPick: async (): Promise<void> => {},
		showWarningMessage: (): undefined => undefined,
		withProgress: async (): Promise<void> => {},
	},
	workspace: {
		getConfiguration: (group: string): unknown => ({
			get: (name: string): unknown => $settings[`${group}.${name}`],
			inspect: (name: string): unknown => ({
				globalValue: $settings[`${group}.${name}`],
				key: name,
			}),
		}),
	},
};

function addSnippet(name: string, data: string): void { // {{{
	vol.mkdirSync('/user/snippets', { recursive: true });

	vol.writeFileSync(`/user/snippets/${name}.json`, data, { encoding: 'utf8' });
} // }}}

function ext2yml({ disabled, enabled, uninstall }: { disabled: string[]; enabled: string[]; uninstall?: string[] }): string { // {{{
	const data: Record<string, Array<{ id: string; uuid: string }>> = {
		disabled: disabled.map((id) => ({
			id,
			uuid: '00000000-0000-0000-0000-000000000000',
		})),
		enabled: enabled.map((id) => ({
			id,
			uuid: '00000000-0000-0000-0000-000000000000',
		})),
	};

	if(uninstall) {
		data.uninstall = uninstall.map((id) => ({
			id,
			uuid: '00000000-0000-0000-0000-000000000000',
		}));
	}

	return yaml.stringify(data);
} // }}}

function getExtensions(): { disabled: string[]; enabled: string[] } { // {{{
	const enabled = $vscode.extensions.all.map(({ id }) => id);
	const disabled = $extensions.filter((id) => !enabled.includes(id));

	disabled.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
	enabled.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

	return {
		disabled,
		enabled,
	};
} // }}}

function reset(): void { // {{{
	$executedCommands.length = 0;
	$extensions.length = 0;
	$managedExtensions.length = 0;
	$outputLines.length = 0;
	$platform = 'linux';
	$settings = {};

	$vscode.extensions.all = [];
} // }}}

function setExtensions({ disabled, enabled }: { disabled: string[]; enabled: string[] }): void { // {{{
	vol.mkdirSync('/.vscode/extensions', { recursive: true });

	for(const id of enabled) {
		$vscode.extensions.all.push({
			id,
			packageJSON: {
				isBuiltin: false,
				isUnderDevelopment: false,
				uuid: '00000000-0000-0000-0000-000000000000',
			},
		});

		const dots = id.split('.');

		vol.mkdirSync(`/.vscode/extensions/${id}-0.0.0`);
		vol.writeFileSync(`/.vscode/extensions/${id}-0.0.0/package.json`, JSON.stringify({
			name: dots[1],
			publisher: dots[0],
			version: '0.0.0',
			__metadata: {
				id: '00000000-0000-0000-0000-000000000000',
			},
		}), {
			encoding: 'utf8',
		});
	}

	for(const id of disabled) {
		const dots = id.split('.');

		vol.mkdirSync(`/.vscode/extensions/${id}-0.0.0`);
		vol.writeFileSync(`/.vscode/extensions/${id}-0.0.0/package.json`, JSON.stringify({
			name: dots[1],
			publisher: dots[0],
			version: '0.0.0',
			__metadata: {
				id: '00000000-0000-0000-0000-000000000000',
			},
		}), {
			encoding: 'utf8',
		});
	}

	$extensions.push(...enabled, ...disabled);
} // }}}

function setKeybindings(data: string | unknown[]): void { // {{{
	let output: string | undefined;

	if(isArray(data)) {
		output = JSON.stringify(data, null, '\t');
	}
	else {
		output = data;
	}

	vol.mkdirSync('/user', { recursive: true });

	vol.writeFileSync('/user/keybindings.json', output, { encoding: 'utf8' });
} // }}}

function setManagedExtensions(managedExtensions: string[]): void { // {{{
	$managedExtensions.push(...managedExtensions);
} // }}}

function setManageExtensions(manage: boolean): void { // {{{
	$manageExtensions = manage;
} // }}}

function setPlatform(platform: string): void { // {{{
	$platform = platform;
} // }}}

function setSettings(data: Record<string, unknown> | string, { hostname, profile }: { hostname: string; profile: string } = { hostname: '', profile: 'main' }): void { // {{{
	vol.mkdirSync('/user', { recursive: true });

	let output: string | undefined;

	if(isString(data)) {
		const args = {
			editor: 'vscode',
			host: hostname,
			os: $platform,
			profile,
			version: '1.0.0',
		};

		output = transform(data, { version: 'version' }, args);

		$settings = unsafeCast<Record<string, unknown>>(JSONC.parse(data));
	}
	else {
		$settings = data;

		output = JSON.stringify(data, null, '\t');
	}

	vol.writeFileSync('/user/settings.json', output, { encoding: 'utf8' });
} // }}}

export {
	addSnippet,
	$executedCommands as executedCommands,
	ext2yml,
	getExtensions,
	$outputLines as outputLines,
	$platform as platform,
	$process as process,
	reset,
	setExtensions,
	setKeybindings,
	setManagedExtensions,
	setManageExtensions,
	setPlatform,
	setSettings,
	$vscode as vscode,
};
