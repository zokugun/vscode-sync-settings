import { configure, gitignore, ignores } from '@zokugun/eslint-config';
import { json, jsonc, yaml } from '@zokugun/eslint-config-data';
import { glossary } from '@zokugun/eslint-config-glossary';
import { javascript, regexp } from '@zokugun/eslint-config-js';
import { markdown } from '@zokugun/eslint-config-md';
import { nodejs } from '@zokugun/eslint-config-nodejs';
import { importX, perfectionist, stylistic } from '@zokugun/eslint-config-style';
import { mocha } from '@zokugun/eslint-config-test';
import { typescript } from '@zokugun/eslint-config-ts';

export default configure([
	ignores(
		'src/resources/default-settings.yml',
		'test/mocks/vscode/*',
		'test/fixtures/**',
	),
	gitignore(),
	glossary(),
	markdown(),
	nodejs(),
	javascript(),
	regexp(),
	typescript(),
	mocha(),
	importX(),
	perfectionist(),
	stylistic(),
	json(),
	jsonc(),
	yaml(),
	{
		files: [
			'README.md/*.jsonc',
			'docs/attributes.md/*.jsonc',
		],
		rules: {
			'jsonc/object-curly-newline': 'off',
		},
	},
]);
