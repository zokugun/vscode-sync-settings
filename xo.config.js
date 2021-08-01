module.exports = {
	ignores: [
		'./*.config.js',
		'./test/fixtures'
	],
	rules: {
		'arrow-parens': [
			'error',
			'always'
		],
		'capitalized-comments': [
			'error',
			'always',
			{
				line: {
					ignorePattern: '.',
				},
			},
		],
		complexity: 'off',
		'default-case': 'off',
		'max-depth': [
			'error',
			8,
		],
		'max-params': [
			'error',
			12,
		],
		'no-else-return': 'off',
		'no-await-in-loop': 'off',
		'one-var': [
			'error',
			{
				initialized: 'never',
				uninitialized: 'consecutive',
			},
		],
		'@typescript-eslint/brace-style': [
			'error',
			'stroustrup',
		],
		'@typescript-eslint/class-literal-property-style': [
			'error',
			'fields'
		],
		'@typescript-eslint/keyword-spacing': [
			'error',
			{
				overrides: {
					if: {
						after: false,
					},
					for: {
						after: false,
					},
					while: {
						after: false,
					},
				},
			},
		],
		'@typescript-eslint/no-confusing-void-expression': 'off',
		'@typescript-eslint/no-namespace': 'off',
		'@typescript-eslint/object-curly-spacing': [
			'error',
			'always',
		],
		'unicorn/empty-brace-spaces': 'off',
		'unicorn/prefer-module': 'off',
		'unicorn/prefer-node-protocol': 'off',
		'unicorn/prefer-switch': 'off',
		'unicorn/prefer-ternary': 'off',
	},
}
