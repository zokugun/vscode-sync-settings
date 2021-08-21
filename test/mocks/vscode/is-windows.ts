interface INavigator {
	userAgent: string;
	language: string;
	maxTouchPoints?: number;
}
declare const navigator: INavigator;

let _isWindows = false;
let _userAgent: string | undefined;

interface INodeProcess {
	platform: string;
	nextTick?: (callback: (...args: any[]) => void) => void;
	versions?: {
		electron?: string;
	};
	sandboxed?: boolean;
	type?: string;
	cwd: () => string;
}

declare const process: INodeProcess;
declare const global: unknown;
declare const self: unknown;

export const globals: any = (typeof self === 'object' ? self : (typeof global === 'object' ? global : {}));

let nodeProcess: INodeProcess | undefined;
if(typeof globals.vscode !== 'undefined' && typeof globals.vscode.process !== 'undefined') {
	// native environment (sandboxed)
	nodeProcess = globals.vscode.process;
}
else if(typeof process !== 'undefined') {
	// native environment (non-sandboxed)
	nodeProcess = process;
}

const isElectronRenderer = typeof nodeProcess?.versions?.electron === 'string' && nodeProcess.type === 'renderer';

// web environment
if(typeof navigator === 'object' && !isElectronRenderer) {
	_userAgent = navigator.userAgent;
	_isWindows = _userAgent.includes('Windows');
}

// native environment
else if(typeof nodeProcess === 'object') {
	_isWindows = (nodeProcess.platform === 'win32');
}

// unknown environment
else {
	console.error('Unable to resolve platform.');
}

export const isWindows = _isWindows;
