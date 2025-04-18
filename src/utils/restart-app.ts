import { spawn } from 'child_process';
import path from 'path';
import process from 'process';
import fse from 'fs-extra';
import vscode from 'vscode';

export async function restartApp(): Promise<void> {
	const product = JSON.parse(await fse.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf-8')) as { nameLong: string; applicationName: string };

	if(process.platform === 'darwin') {
		await restartMac(product);
	}
	else if(process.platform === 'win32') {
		await restartWindows(product);
	}
	else {
		await restartLinux(product);
	}
}

async function getAppBinary(appHomeDir: string, appName: string): Promise<string> {
	let files = await fse.readdir(appHomeDir);

	if(files.length === 1) {
		return path.join(appHomeDir, files[0]);
	}

	// remove tunnel
	files = files.filter((file) => !file.includes('-tunnel'));

	if(files.length === 1) {
		return path.join(appHomeDir, files[0]);
	}

	if(process.platform === 'win32') {
		// select *.cmd
		const cmdFiles = files.filter((file) => file.endsWith('.cmd') && file.toLowerCase().includes(appName.toLowerCase()));

		if (cmdFiles.length === 1) {
			return path.join(appHomeDir, cmdFiles[0]);
		}
	}

	const binary = files.find((file) => file.toLowerCase().includes(appName.toLowerCase()));

	if(!binary) {
		throw new Error('Cannot determine binary path');
	}

	return path.join(appHomeDir, binary);
}

async function restartMac({ nameLong, applicationName }: { nameLong: string; applicationName: string }): Promise<void> {
	const match = /(.*\.app)\/Contents\/Frameworks\//.exec(process.execPath);
	const appPath = match ? match[1] : `/Applications/${nameLong}.app`;
	const binary = await getAppBinary(`${appPath}/Contents/Resources/app/bin/`, applicationName);

	spawn('osascript', ['-e', `quit app "${nameLong}"`, '-e', 'delay 1', '-e', `do shell script quoted form of "${binary}"`], {
		detached: true,
		stdio: 'ignore',
	});
}

async function restartWindows({ applicationName }: { applicationName: string }): Promise<void> {
	const appHomeDir = path.dirname(process.execPath);
	const exeName = path.basename(process.execPath);
	const binaryPath = applicationName === 'cursor'
		? path.join(appHomeDir, 'resources', 'app', 'bin')
		: path.join(appHomeDir, 'bin');
	const binary = await getAppBinary(binaryPath, applicationName);

	spawn(process.env.comspec ?? 'cmd', [`/C taskkill /F /IM ${exeName} >nul && timeout /T 1 && "${binary}"`], {
		detached: true,
		stdio: 'ignore',
		windowsVerbatimArguments: true,
	});
}

async function restartLinux({ applicationName }: { applicationName: string }): Promise<void> {
	const appHomeDir = path.dirname(process.execPath);
	const binary = await getAppBinary(`${appHomeDir}/bin/`, applicationName);

	spawn('/bin/sh', ['-c', `killall "${process.execPath}" && sleep 1 && killall -9 "${process.execPath}" && sleep 1 && "${binary}"`], {
		detached: true,
		stdio: 'ignore',
	});
}
