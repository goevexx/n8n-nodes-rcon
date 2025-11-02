import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RconApi implements ICredentialType {
	name = 'rconApi';
	displayName = 'RCON API';
	documentationUrl = 'https://github.com/goevexx/n8n-nodes-rcon#quick-start';
	properties: INodeProperties[] = [
		{
			displayName: 'Protocol',
			name: 'protocol',
			type: 'options',
			options: [
				{
					name: 'Source RCON (TCP)',
					value: 'source',
					description: 'Used by Minecraft, CS:GO, CS2, TF2, ARK, Rust (old), 7 Days to Die, Conan Exiles, Space Engineers',
				},
				{
					name: 'BattlEye RCON (UDP)',
					value: 'battleye',
					description: 'Used by DayZ, ARMA 2, ARMA 3, Arma Reforger',
				},
			],
			default: 'source',
			required: true,
			description: 'RCON protocol type - depends on the game server',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
			required: true,
			description: 'Server hostname or IP address',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 25575,
			required: true,
			description: 'RCON port (Source: 25575 for Minecraft, 27015 for Source games; BattlEye: typically game port, e.g., 2305 for DayZ)',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'RCON password',
		},
		{
			displayName: 'Connection Timeout',
			name: 'timeout',
			type: 'number',
			default: 5000,
			description: 'Connection timeout in milliseconds',
		},
	];

	// Credential testing is handled by 'rconConnectionTest' method in Rcon.node.ts
	// Referenced via testedBy property in the node's credentials array
}
