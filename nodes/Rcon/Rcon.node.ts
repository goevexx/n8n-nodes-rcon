import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createRconClient } from './helpers';
import { RconError } from '../../src/types';

export class Rcon implements INodeType {
	usableAsTool = true;

	description: INodeTypeDescription = {
		displayName: 'RCON',
		name: 'rcon',
		icon: 'file:rcon.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute commands on game servers via RCON',
		defaults: {
			name: 'RCON',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rconApi',
				required: true,
				testedBy: 'rconConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send Command',
						value: 'sendCommand',
						description: 'Execute a command on the RCON server',
						action: 'Send command',
					},
				],
				default: 'sendCommand',
			},
			{
				displayName: 'Command Mode',
				name: 'commandMode',
				type: 'options',
				options: [
					{
						name: 'Single Command',
						value: 'single',
						description: 'Execute a single command',
					},
					{
						name: 'Multiple Commands',
						value: 'multi',
						description: 'Execute multiple commands sequentially (one per line)',
					},
				],
				default: 'single',
				displayOptions: {
					show: {
						operation: ['sendCommand'],
					},
				},
				description: 'Whether to execute one command or multiple commands',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['sendCommand'],
						commandMode: ['single'],
					},
				},
				description: 'The RCON command to execute (e.g., "list", "say Hello")',
			},
			{
				displayName: 'Commands',
				name: 'command',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['sendCommand'],
						commandMode: ['multi'],
					},
				},
				description: 'RCON commands to execute (one per line). All commands will be executed sequentially in the same authentication session.',
			},
			{
				displayName: 'Error Pattern (RegExp)',
				name: 'errorPattern',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['sendCommand'],
					},
				},
				description: 'Optional regular expression pattern. If the response matches this pattern, the node execution will fail. Example: "Unknown command|Error|Failed"',
			},
		],
	};

	methods = {
		credentialTest: {
			async rconConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;

				try {
					// Log credentials for debugging
					console.log('Testing RCON connection with:', {
						host: credentials.host,
						port: credentials.port,
						timeout: credentials.timeout,
					});

					const rcon = createRconClient(credentials);

					// Test connection and authentication
					await rcon.connect();

					// Verify we're actually authenticated
					if (!rcon.isAuthenticated()) {
						throw new Error('Authentication failed');
					}

					await rcon.disconnect();

					return {
						status: 'OK',
						message: 'Connection successful! Authentication verified.',
					};
				} catch (error) {
					const errorMessage = error instanceof Error
						? error.message
						: 'Unknown error occurred during connection test';

					return {
						status: 'Error',
						message: `Connection test failed: ${errorMessage}`,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('rconApi', i);
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'sendCommand') {
					const commandMode = this.getNodeParameter('commandMode', i) as string;
					const commandInput = this.getNodeParameter('command', i) as string;
					const errorPattern = this.getNodeParameter('errorPattern', i, '') as string;

					// Debug: Log parameter retrieval
					console.log('[RCON Node Debug] Parameters retrieved:', {
						commandMode,
						commandInput: commandInput.substring(0, 50),
						errorPattern: errorPattern,
						errorPatternType: typeof errorPattern,
						errorPatternLength: errorPattern.length,
						errorPatternEmpty: errorPattern === '',
						errorPatternTrimmed: errorPattern.trim(),
					});

					// Compile error pattern if provided
					let errorRegex: RegExp | null = null;
					if (errorPattern && errorPattern.trim().length > 0) {
						try {
							errorRegex = new RegExp(errorPattern.trim());
							console.log('[RCON Node Debug] Compiled regex:', {
								pattern: errorPattern.trim(),
								regex: errorRegex.toString(),
							});
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Invalid error pattern RegExp: ${error instanceof Error ? error.message : 'Unknown error'}`,
								{ itemIndex: i }
							);
						}
					} else {
						console.log('[RCON Node Debug] No error pattern provided or empty string');
					}

					const rcon = createRconClient(credentials);

					try {
						await rcon.connect();

						if (commandMode === 'single') {
							// Single command mode
							const response = await rcon.execute(commandInput);
							await rcon.disconnect();

							// Debug logging
							console.log('[RCON Node Debug] Single command response:', {
								command: commandInput,
								responseLength: response.length,
								responseRaw: JSON.stringify(response),
								errorPattern: errorPattern,
								hasErrorRegex: !!errorRegex,
								regexTest: errorRegex ? errorRegex.test(response) : null,
							});

							// Check error pattern
							if (errorRegex && errorRegex.test(response)) {
								throw new NodeOperationError(
									this.getNode(),
									`Command response matched error pattern: ${response}`,
									{
										itemIndex: i,
										description: `Error pattern "${errorPattern}" matched in response`,
									}
								);
							}

							returnData.push({
								json: {
									command: commandInput,
									response,
									timestamp: new Date().toISOString(),
								},
								pairedItem: i,
							});
						} else if (commandMode === 'multi') {
							// Multi-command mode
							const commands = commandInput
								.split('\n')
								.map(cmd => cmd.trim())
								.filter(cmd => cmd.length > 0);

							const responses: Array<{ command: string; response: string }> = [];
							const errors: string[] = [];

							for (const command of commands) {
								const response = await rcon.execute(command);
								responses.push({ command, response });

								// Debug logging
								console.log('[RCON Node Debug] Multi command response:', {
									command: command,
									responseLength: response.length,
									responseRaw: JSON.stringify(response),
									errorPattern: errorPattern,
									hasErrorRegex: !!errorRegex,
									regexTest: errorRegex ? errorRegex.test(response) : null,
								});

								// Check error pattern for each response
								if (errorRegex && errorRegex.test(response)) {
									errors.push(`Command "${command}" matched error pattern: ${response}`);
								}
							}

							await rcon.disconnect();

							// If any command matched error pattern, fail
							if (errors.length > 0) {
								throw new NodeOperationError(
									this.getNode(),
									`${errors.length} command(s) matched error pattern:\n${errors.join('\n')}`,
									{
										itemIndex: i,
										description: `Error pattern "${errorPattern}" matched in ${errors.length} response(s)`,
									}
								);
							}

							returnData.push({
								json: {
									commands: commands,
									responses: responses,
									totalCommands: commands.length,
									timestamp: new Date().toISOString(),
								},
								pairedItem: i,
							});
						}
					} catch (error) {
						await rcon.disconnect();
						throw error;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof RconError
						? error.message
						: error instanceof Error
						? error.message
						: 'Unknown error occurred';

					returnData.push({
						json: {
							error: errorMessage,
							timestamp: new Date().toISOString(),
						},
						pairedItem: i,
					});
					continue;
				}

				// Convert to NodeOperationError for better n8n error handling
				if (error instanceof RconError) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
						description: `RCON Error: ${error.type}`,
					});
				}

				throw error;
			}
		}

		return [returnData];
	}
}
