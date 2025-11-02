import { IDataObject } from 'n8n-workflow';
import { RconClient } from '../../src/RconClient';
import { BattlEyeRconClient } from '../../src/BattlEyeRconClient';
import { RconProtocol } from '../../src/types';

/**
 * Create an RCON client from n8n credentials
 * @param credentials Credentials object from n8n context
 * @returns Configured RconClient or BattlEyeRconClient instance
 */
export function createRconClient(credentials: IDataObject): RconClient | BattlEyeRconClient {
	const protocol = (credentials.protocol as string) || RconProtocol.SOURCE;
	const options = {
		host: credentials.host as string,
		port: credentials.port as number,
		password: credentials.password as string,
		timeout: (credentials.timeout as number) || 5000,
		protocol,
	};

	if (protocol === RconProtocol.BATTLEYE || protocol === 'battleye') {
		return new BattlEyeRconClient(options);
	}

	// Default to Source RCON
	return new RconClient(options);
}
