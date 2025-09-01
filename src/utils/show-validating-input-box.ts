import { err, ok, type Result } from '@zokugun/xtry';
import * as vscode from 'vscode';
import { dispose, type IDisposable } from './dispose.js';

export async function showValidatingInputBox(options: {
	title?: string;
	step?: number;
	totalSteps?: number;
	prompt?: string;
	placeHolder?: string;
	value?: string;
	validateInput: (value: string) => string | undefined | null | Promise<string | undefined | null>;
	ignoreFocusOut?: boolean;
}): Promise<Result<string | undefined, string>> {
	const input = vscode.window.createInputBox();

	if(options.title) {
		input.title = options.title;
	}

	if(options.step !== undefined) {
		input.step = options.step;
	}

	if(options.totalSteps !== undefined) {
		input.totalSteps = options.totalSteps;
	}

	if(options.prompt) {
		input.prompt = options.prompt;
	}

	if(options.placeHolder) {
		input.placeholder = options.placeHolder;
	}

	if(options.value) {
		input.value = options.value;
	}

	if(options.ignoreFocusOut !== undefined) {
		input.ignoreFocusOut = options.ignoreFocusOut;
	}

	const getValidationMessage = async (text: string): Promise<string | undefined> => {
		const message = await options.validateInput(text);

		if(typeof message === 'string') {
			return message;
		}
	};

	input.validationMessage = await getValidationMessage(input.value);

	input.show();

	const disposables: IDisposable[] = [];

	const name = await new Promise<Result<string | undefined, string>>((resolve) => {
		disposables.push(
			input.onDidHide(() => resolve(ok(undefined))),
			input.onDidAccept(async () => {
				const { value } = input;
				const message = await getValidationMessage(value);

				if(message === undefined) {
					resolve(ok(value));
				}
				else {
					resolve(err(message));
				}
			}),
			input.onDidChangeValue(async (value) => {
				input.validationMessage = await getValidationMessage(value);
			}),
		);
	});

	dispose(disposables);
	input.dispose();

	return name;
}
