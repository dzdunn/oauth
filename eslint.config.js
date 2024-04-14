// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import stylisticJs from '@stylistic/eslint-plugin-js';


export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				project: [
					'./tsconfig.json',
					'./packages/*/tsconfig.node.json',
					'./packages/*/tsconfig.json'
				],
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		plugins: {
			'@stylistic/js': stylisticJs
		},
		rules: {
			"semi": [ "error", "always" ],
			"@stylistic/js/object-curly-spacing": [ "error", "always" ],
			"@stylistic/js/array-bracket-spacing": [ "error", "always" ]
		}
	},
	{
		files: [ '**/*.ts', '**/*.tsx' ],
		plugins: {
			react: reactPlugin,
			'react-hooks': hooksPlugin,
			'react-refresh': reactRefresh
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2020
			}
		},
		// @ts-expect-error: Cannot cast rules of record type
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactPlugin.configs['jsx-runtime'].rules,
			...hooksPlugin.configs.recommended.rules,
			'react-refresh/only-export-components': [ 'warn', { allowConstantExport: true } ]
		},
		settings: {
			react: {
				version: "18.2"
			}
		}
	},
	{
		// Must be specified independently to be globally applied to all config objects.
		// https://eslint.org/docs/latest/use/configure/configuration-files-new#globally-ignoring-files-with-ignores
		ignores: [
			".yarn",
			"**/build",
			"**/dist"
		]
	}
);