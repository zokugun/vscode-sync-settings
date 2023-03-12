import { spawn } from 'child_process';
import path from 'path';
import process from 'process';
import fse from 'fs-extra';
import vscode from 'vscode';

export async function restartApp(): Promise<void> {
	const product = JSON.parse(await fse.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf-8')) as { nameLong: string };

	if(process.platform === 'darwin') {
		await restartMac(product);
	}
	else if(process.platform === 'win32') {
		await restartWindows();
	}
	else {
		await restartLinux();
	}
}

async function getAppBinary(appHomeDir: string): Promise<string> {
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
		files = files.filter((file) => file.endsWith('.cmd'));

		if(files.length === 1) {
			return path.join(appHomeDir, files[0]);
		}
	}

	throw new Error('Can determine binary path');
}

async function restartMac({ nameLong }: { nameLong: string }): Promise<void> {
	const match = /(.*\.app)\/Contents\/Frameworks\//.exec(process.execPath);
	const appPath = match ? match[1] : `/Applications/${nameLong}.app`;
	const binary = await getAppBinary(`${appPath}/Contents/Resources/app/bin/`);

	spawn('osascript', ['-e', `quit app "${nameLong}"`, '-e', 'delay 1', '-e', `do shell script quoted form of "${binary}"`], {
		detached: true,
		stdio: 'ignore',
	});
}

async function restartWindows(): Promise<void> {
	const appHomeDir = path.dirname(process.execPath);
	const exeName = path.basename(process.execPath);
	const binary = await getAppBinary(`${appHomeDir}\\bin\\`);

	spawn(process.env.comspec ?? 'cmd', [`/C taskkill /F /IM ${exeName} >nul && timeout /T 1 && "${binary}"`], {
		detached: true,
		stdio: 'ignore',
		windowsVerbatimArguments: true,
	});
}

async function restartLinux(): Promise<void> {
	const appHomeDir = path.dirname(process.execPath);
	const binary = await getAppBinary(`${appHomeDir}/bin/`);

	spawn('/bin/sh', ['-c', `killall "${process.execPath}" && sleep 1 && killall -9 "${process.execPath}" && sleep 1 && "${binary}"`], {
		detached: true,
		stdio: 'ignore',
	});
}
