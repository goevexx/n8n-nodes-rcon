import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		files: ['src/**/*.ts', 'nodes/**/*.ts', 'credentials/**/*.ts'],
		rules: {
			// Allow Node.js built-in modules for self-hosted nodes
			'@n8n/community-nodes/no-restricted-imports': 'off',
			'@n8n/community-nodes/no-restricted-globals': 'off',
			// Disable cloud-specific validation rules for self-hosted nodes
			'@n8n/community-nodes/icon-validation': 'off',
			'@n8n/community-nodes/node-usable-as-tool': 'off',
			'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'off',
		},
	},
	{
		ignores: ['bin/**', 'examples/**', 'tests/**', '.build-package/**', 'dist/**', '**/*.d.ts'],
	},
];
