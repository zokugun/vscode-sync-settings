import { OutputChannel } from 'vscode';
import { vol } from 'memfs';
import { transform } from '@daiyam/jsonc-preprocessor';
import * as JSONC from 'jsonc-parser';
import { Uri } from './vscode/uri';

interface Extension {
	id: string;
	packageJSON: {
		isBuiltin: boolean;
		isUnderDevelopment: boolean;
	};
}

const $executedCommands: string[] = [];
const $outputLines: string[] = [];

const $outputChannel = {
	appendLine: (value: string) => {
		$outputLines.push(value);
	},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	show: () => {},
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
		getCommands: () => [
			'workbench.action.reloadWindow',
			'workbench.extensions.disableExtension',
			'workbench.extensions.enableExtension',
			'workbench.extensions.installExtension',
			'workbench.extensions.uninstallExtension',
		],
		executeCommand: (command: string, ...args: any[]) => { // {{{
			$executedCommands.push(command);

			if(command === 'workbench.extensions.disableExtension') {
				const id = args[0] as string;

				for(const [index, ext] of $vscode.extensions.all.entries()) {
					if(ext.id === id) {
						$vscode.extensions.all.splice(index, 1);

						break;
					}
				}
			}
			else if(command === 'workbench.extensions.enableExtension') {
				const id = args[0] as string;

				if(!$vscode.extensions.all.some((ext) => ext.id === id)) {
					$vscode.extensions.all.push({
						id,
						packageJSON: {
							isBuiltin: false,
							isUnderDevelopment: false,
						},
					});
				}
			}
			else if(command === 'workbench.extensions.installExtension') {
				const id = args[0] as string;

				if(!$vscode.extensions.all.some((ext) => ext.id === id)) {
					$vscode.extensions.all.push({
						id,
						packageJSON: {
							isBuiltin: false,
							isUnderDevelopment: false,
						},
					});

					vol.mkdirpSync(`/.vscode/extensions/${id}-0.0.0`);
				}
			}
			else if(command === 'workbench.extensions.uninstallExtension') {
				const id = args[0] as string;

				for(const [index, ext] of $vscode.extensions.all.entries()) {
					if(ext.id === id) {
						$vscode.extensions.all.splice(index, 1);

						break;
					}
				}

				const dir = `/.vscode/extensions/${id}-0.0.0`;
				if(vol.existsSync(dir)) {
					vol.rmdirSync(dir);
				}
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
	},
	extensions: {
		all: [] as Extension[],
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
		showQuickPick: async (): Promise<void> => Promise.resolve(),
		createOutputChannel: (): Partial<OutputChannel> => $outputChannel,
		withProgress: async (): Promise<void> => Promise.resolve(),
	},
	workspace: {
		getConfiguration: (group: string) => ({
			get: (name: string): any => $settings[`${group}.${name}`],
			inspect: (name: string): any => $settings[`${group}.${name}`],
		}),
	},
};

function addSnippet(name: string, data: string): void { // {{{
	vol.mkdirpSync('/user/snippets');

	vol.writeFileSync(`/user/snippets/${name}.json`, data, { encoding: 'utf-8' });
} // }}}

function getExtensions(): { disabled: string[]; enabled: string[] } { // {{{
	const enabled = $vscode.extensions.all.map(({ id }) => id);

	const disabled = [];

	for(const dir of vol.readdirSync('/.vscode/extensions/') as string[]) {
		const name = dir.replace(/-0\.0\.0$/, '');

		if(!enabled.includes(name)) {
			disabled.push(name);
		}
	}

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
			},
		});

		vol.mkdirSync(`/.vscode/extensions/${id}-0.0.0`);
	}

	for(const id of disabled) {
		vol.mkdirSync(`/.vscode/extensions/${id}-0.0.0`);
	}
} // }}}

function setKeybindings(data: string | any[]): void { // {{{
	if(Array.isArray(data)) {
		data = JSON.stringify(data, null, '\t');
	}

	vol.mkdirpSync('/user');

	vol.writeFileSync('/user/keybindings.json', data, { encoding: 'utf-8' });
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		$settings = JSONC.parse(data);
	}
	else {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		$settings = data;
		data = JSON.stringify(data, null, '\t');
	}

	vol.writeFileSync('/user/settings.json', data, { encoding: 'utf-8' });
} // }}}

export function reset(): void { // {{{
	$executedCommands.length = 0;
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
	getExtensions,
	setExtensions,
	setKeybindings,
	setPlatform,
	setSettings,
};
