import { IDataObject } from 'n8n-workflow';
import { RconClient } from '../../src/RconClient';

/**
 * Create an RCON client from n8n credentials
 * @param credentials Credentials object from n8n context
 * @returns Configured RconClient instance
 */
export function createRconClient(credentials: IDataObject): RconClient {
	return new RconClient({
		host: credentials.host as string,
		port: credentials.port as number,
		password: credentials.password as string,
		timeout: (credentials.timeout as number) || 5000,
	});
}
