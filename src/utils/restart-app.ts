import { spawn } from 'child_process';
import path from 'path';
import process from 'process';
import fse from 'fs-extra';
import vscode from 'vscode';

export async function restartApp(): Promise<void> {
	const product = JSON.parse(await fse.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf-8')) as { nameLong: string; applicationName: string };

	if(process.platform === 'darwin') {
		restartMac(product);
	}
	else if(process.platform === 'win32') {
		restartWindows(product);
	}
	else {
		restartLinux(product);
	}
}

function restartMac({ nameLong, applicationName }: { nameLong: string; applicationName: string }): void {
	const match = /(.*\.app)\/Contents\/Frameworks\//.exec(process.execPath);
	const appPath = match ? match[1] : `/Applications/${nameLong}.app`;

	spawn('osascript', ['-e', `quit app "${nameLong}"`, '-e', 'delay 1', '-e', `do shell script quoted form of "${appPath}/Contents/Resources/app/bin/${applicationName}"`], {
		detached: true,
		stdio: 'ignore',
	});
}

function restartWindows({ applicationName }: { applicationName: string }): void {
	const appHomeDir = path.dirname(process.execPath);
	const exeName = path.basename(process.execPath);

	spawn(process.env.comspec ?? 'cmd', [`/C taskkill /F /IM ${exeName} >nul && timeout /T 1 && "${appHomeDir}\\bin\\${applicationName}"`], {
		detached: true,
		stdio: 'ignore',
		windowsVerbatimArguments: true,
	});
}

function restartLinux({ applicationName }: { applicationName: string }): void {
	const appHomeDir = path.dirname(process.execPath);

	spawn('/bin/sh', ['-c', `killall "${process.execPath}" && sleep 1 && killall -9 "${process.execPath}" && sleep 1 && ${appHomeDir}/bin/${applicationName}`], {
		detached: true,
		stdio: 'ignore',
	});
}
