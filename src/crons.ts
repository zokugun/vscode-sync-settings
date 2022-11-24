import vscode from 'vscode';

type Crons = {
	download?: string;
	review?: string;
	upload?: string;
};

const $cronsIds = {
	download: '',
	review: '',
	upload: '',
};

export async function setupCrons() {
	for(const key in $cronsIds) {
		if($cronsIds[key]) {
			await vscode.commands.executeCommand('cronTasks.unregister', $cronsIds[key]);

			$cronsIds[key] = '';
		}
	}

	const config = vscode.workspace.getConfiguration('syncSettings');
	const crons = config.get<Crons>('crons') ?? {};

	if(crons.download) {
		$cronsIds.download = await vscode.commands.executeCommand('cronTasks.register', crons.download, 'syncSettings.download');
	}

	if(crons.review) {
		$cronsIds.review = await vscode.commands.executeCommand('cronTasks.register', crons.review, 'syncSettings.review');
	}

	if(crons.upload) {
		$cronsIds.upload = await vscode.commands.executeCommand('cronTasks.register', crons.upload, 'syncSettings.upload');
	}
}
