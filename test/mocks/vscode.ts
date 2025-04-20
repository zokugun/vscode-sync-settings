import { transform } from '@daiyam/jsonc-preprocessor';
import * as JSONC from 'jsonc-parser';
import { vol } from 'memfs';
import { type OutputChannel } from 'vscode';
import yaml from 'yaml';
import { Uri } from './vscode/uri.js';

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
	appendLine(value: string) {
		$outputLines.push(value);
	},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	show() {},
};

// eslint-disable-next-line import/no-mutable-exports
let $platform = 'linux';

const $process = {
	get platform() {
		return $platform;
	},
};

let $settings: Record<string, any> = {};

const $vscode = {
	commands: {
		getCommands() {
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
		executeCommand(command: string, ...args: any[]) { // {{{
			$executedCommands.push(command);

			if(command === 'workbench.extensions.disableExtension') {
				const id = args[0] as string;

				for(const [index, extension] of $vscode.extensions.all.entries()) {
					if(extension.id === id) {
						$vscode.extensions.all.splice(index, 1);

						break;
					}
				}
			}
			else if(command === 'workbench.extensions.enableExtension') {
				const id = args[0] as string;

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
				const id = args[0] as string;

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

					vol.mkdirpSync(`/.vscode/extensions/${id}-0.0.0`);
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
				const id = args[0] as string;

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
	},
	DiagnosticSeverity: {
		Error: 0,
		Warning: 1,
		Information: 2,
		Hint: 3,
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
		getExtension(name: string) {
			if(name === 'zokugun.vsix-manager') {
				return {
					exports: {
						listManagedExtensions() {
							return $managedExtensions;
						},
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						installExtensions() {},
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
		showWarningMessage: (): undefined => undefined,
		showErrorMessage: (): undefined => undefined,
		showInformationMessage: (): undefined => undefined,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		async showQuickPick(): Promise<void> {},
		createOutputChannel: (): Partial<OutputChannel> => $outputChannel,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		async withProgress(): Promise<void> {},
	},
	workspace: {
		getConfiguration: (group: string) => ({
			get: (name: string): any => $settings[`${group}.${name}`],
			inspect: (name: string): any => ({
				key: name,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				globalValue: $settings[`${group}.${name}`],
			}),
		}),
	},
};

function addSnippet(name: string, data: string): void { // {{{
	vol.mkdirpSync('/user/snippets');

	vol.writeFileSync(`/user/snippets/${name}.json`, data, { encoding: 'utf8' });
} // }}}

// eslint-disable-next-line unicorn/prevent-abbreviations
function ext2yml({ disabled, enabled, uninstall }: { disabled: string[]; enabled: string[]; uninstall?: string[] }): string { // {{{
	const data: any = {
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

function setKeybindings(data: string | any[]): void { // {{{
	if(Array.isArray(data)) {
		data = JSON.stringify(data, null, '\t');
	}

	vol.mkdirpSync('/user');

	vol.writeFileSync('/user/keybindings.json', data, { encoding: 'utf8' });
} // }}}

function setManageExtensions(manage: boolean): void { // {{{
	$manageExtensions = manage;
} // }}}

function setManagedExtensions(managedExtensions: string[]): void { // {{{
	$managedExtensions.push(...managedExtensions);
} // }}}

function setPlatform(platform: string): void { // {{{
	$platform = platform;
} // }}}

function setSettings(data: any | string, { profile, hostname }: { profile: string; hostname: string } = { profile: 'main', hostname: '' }): void { // {{{
	vol.mkdirpSync('/user');

	if(typeof data === 'string') {
		const args = {
			host: hostname,
			profile,
			os: $platform,
			editor: 'vscode',
			version: '1.0.0',
		};

		data = transform(data, { version: 'version' }, args);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment
		$settings = JSONC.parse(data);
	}
	else {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		$settings = data;
		data = JSON.stringify(data, null, '\t');
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	vol.writeFileSync('/user/settings.json', data, { encoding: 'utf8' });
} // }}}

export function reset(): void { // {{{
	$executedCommands.length = 0;
	$extensions.length = 0;
	$managedExtensions.length = 0;
	$outputLines.length = 0;
	$platform = 'linux';
	$settings = {};

	$vscode.extensions.all = [];
} // }}}

export {
	$executedCommands as executedCommands,
	$outputLines as outputLines,
	$platform as platform,
	$process as process,
	$vscode as vscode,
	addSnippet,
	ext2yml,
	getExtensions,
	setExtensions,
	setKeybindings,
	setManageExtensions,
	setManagedExtensions,
	setPlatform,
	setSettings,
};
