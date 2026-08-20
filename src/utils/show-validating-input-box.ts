import { isBoolean, isNumber, isString } from '@zokugun/is-it-type';
import { err, ok, type Result } from '@zokugun/xtry';
import * as vscode from 'vscode';

import { dispose, type IDisposable } from './dispose.js';

export async function showValidatingInputBox(options: {
	ignoreFocusOut?: boolean;
	placeHolder?: string;
	prompt?: string;
	step?: number;
	title?: string;
	totalSteps?: number;
	validateInput: (value: string) => Promise<string | null | undefined> | string | null | undefined;
	value?: string;
}): Promise<Result<string | undefined, string>> {
	const input = vscode.window.createInputBox();

	if(isString(options.title)) {
		input.title = options.title;
	}

	if(isNumber(options.step)) {
		input.step = options.step;
	}

	if(isNumber(options.totalSteps)) {
		input.totalSteps = options.totalSteps;
	}

	if(isString(options.prompt)) {
		input.prompt = options.prompt;
	}

	if(isString(options.placeHolder)) {
		input.placeholder = options.placeHolder;
	}

	if(isString(options.value)) {
		input.value = options.value;
	}

	if(isBoolean(options.ignoreFocusOut)) {
		input.ignoreFocusOut = options.ignoreFocusOut;
	}

	const getValidationMessage = async (text: string): Promise<string | undefined> => {
		const message = await options.validateInput(text);

		if(typeof message === 'string') {
			return message;
		}
		else {
			return undefined;
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
