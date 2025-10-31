import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RconApi implements ICredentialType {
	name = 'rconApi';
	displayName = 'RCON API';
	// documentationUrl: Set this to your GitHub README URL when publishing
	// Example: documentationUrl = 'https://github.com/yourusername/n8n-nodes-rcon#configure-credentials';
	properties: INodeProperties[] = [
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
			description: 'RCON port (default: 25575 for Minecraft, 27015 for Source games)',
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
