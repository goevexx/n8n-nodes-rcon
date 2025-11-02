import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import {
	RconOptions,
	ConnectionState,
	RconError,
	RconErrorType,
} from './types';

/**
 * BattlEye RCON Client - Implementation of the BattlEye RCON Protocol
 *
 * Features:
 * - UDP-based communication
 * - CRC32 checksum validation
 * - Password authentication
 * - Command execution with acknowledgments
 * - Server message handling
 * - 45-second keepalive heartbeat
 *
 * Protocol Specification: https://www.battleye.com/downloads/BERConProtocol.txt
 *
 * Used by: DayZ, ARMA 2, ARMA 3, Arma Reforger
 *
 * @example
 * ```typescript
 * const rcon = new BattlEyeRconClient({
 *   host: '192.168.1.100',
 *   port: 2305,
 *   password: 'my_password'
 * });
 *
 * await rcon.connect();
 * const response = await rcon.execute('players');
 * console.log(response);
 * await rcon.disconnect();
 * ```
 */
export class BattlEyeRconClient extends EventEmitter {
	private socket: dgram.Socket | null = null;
	private state: ConnectionState = ConnectionState.DISCONNECTED;
	private sequenceNumber = 0;
	private pendingCommands: Map<number, PendingCommand> = new Map();
	private heartbeatInterval: NodeJS.Timeout | null = null;

	private readonly host: string;
	private readonly port: number;
	private readonly password: string;
	private readonly timeout: number;
	private readonly debug: boolean;

	constructor(options: RconOptions) {
		super();

		this.host = options.host;
		this.port = options.port ?? 2305;
		this.password = options.password;
		this.timeout = options.timeout ?? 5000;
		this.debug = options.debug ?? false;

		this.log('BattlEye RCON Client initialized', { host: this.host, port: this.port });
	}

	/**
	 * Get current connection state
	 */
	public getState(): ConnectionState {
		return this.state;
	}

	/**
	 * Check if connected and authenticated
	 */
	public isAuthenticated(): boolean {
		return this.state === ConnectionState.AUTHENTICATED;
	}

	/**
	 * Connect to BattlEye RCON server and authenticate
	 */
	public async connect(): Promise<void> {
		if (this.state !== ConnectionState.DISCONNECTED) {
			throw new RconError(
				RconErrorType.CONNECTION_FAILED,
				'Already connected or connecting'
			);
		}

		this.setState(ConnectionState.CONNECTING);

		try {
			// Create UDP socket
			await this.createSocket();

			// Authenticate
			await this.authenticate();

			this.setState(ConnectionState.AUTHENTICATED);
			this.emit('authenticated');

			// Start heartbeat to keep connection alive
			this.startHeartbeat();

			this.log('Successfully connected and authenticated');
		} catch (error) {
			this.setState(ConnectionState.ERROR);
			this.cleanup();
			throw error;
		}
	}

	/**
	 * Execute a command on the RCON server
	 */
	public async execute(command: string): Promise<string> {
		if (!this.isAuthenticated()) {
			throw new RconError(
				RconErrorType.NOT_AUTHENTICATED,
				'Not authenticated. Call connect() first.'
			);
		}

		this.log(`Executing command: ${command}`);

		const seqNum = this.getNextSequenceNumber();

		try {
			// Send command packet
			this.sendCommandPacket(seqNum, command);

			// Wait for response
			const response = await this.waitForResponse(seqNum);

			this.log(`Command executed successfully, response length: ${response.length}`);

			return response;
		} catch (error) {
			this.log(`Command execution failed: ${error}`);
			throw new RconError(
				RconErrorType.COMMAND_FAILED,
				`Failed to execute command: ${command}`,
				error as Error
			);
		}
	}

	/**
	 * Disconnect from RCON server
	 */
	public async disconnect(): Promise<void> {
		this.log('Disconnecting...');
		this.cleanup();
		this.setState(ConnectionState.DISCONNECTED);
		this.emit('disconnected');
	}

	/**
	 * Create UDP socket
	 */
	private async createSocket(): Promise<void> {
		return new Promise((resolve) => {
			this.socket = dgram.createSocket('udp4');

			this.socket.on('message', (msg: Buffer) => {
				this.handleMessage(msg);
			});

			this.socket.on('error', (error: Error) => {
				this.log(`Socket error: ${error.message}`);
				this.emit('error', new RconError(
					RconErrorType.SOCKET_ERROR,
					error.message,
					error
				));
			});

			this.socket.on('close', () => {
				this.log('Socket closed');
				this.emit('close');
				if (this.state !== ConnectionState.DISCONNECTED) {
					this.setState(ConnectionState.DISCONNECTED);
					this.cleanup();
				}
			});

			this.setState(ConnectionState.CONNECTED);
			resolve();
		});
	}

	/**
	 * Authenticate with the server
	 */
	private async authenticate(): Promise<void> {
		this.setState(ConnectionState.AUTHENTICATING);
		this.log('Authenticating...');

		return new Promise((resolve, reject) => {
			const timeoutHandle = setTimeout(() => {
				reject(new RconError(
					RconErrorType.TIMEOUT,
					'Authentication timeout'
				));
			}, this.timeout);

			// Store pending auth response handler
			const authHandler = (success: boolean) => {
				clearTimeout(timeoutHandle);
				if (success) {
					resolve();
				} else {
					reject(new RconError(
						RconErrorType.AUTH_FAILED,
						'Authentication failed - incorrect password'
					));
				}
			};

			// Temporarily store auth handler
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this as any)._authHandler = authHandler;

			// Send login packet
			this.sendLoginPacket();
		});
	}

	/**
	 * Send login packet (0x00)
	 */
	private sendLoginPacket(): void {
		const payload = Buffer.concat([
			Buffer.from([0x00]), // Login packet type
			Buffer.from(this.password, 'utf8')
		]);

		this.sendPacket(payload);
		this.log('Login packet sent');
	}

	/**
	 * Send command packet (0x01)
	 */
	private sendCommandPacket(sequenceNumber: number, command: string): void {
		const payload = Buffer.concat([
			Buffer.from([0x01]), // Command packet type
			Buffer.from([sequenceNumber]),
			Buffer.from(command, 'utf8')
		]);

		this.sendPacket(payload);
		this.log(`Command packet sent: seq=${sequenceNumber}, cmd="${command}"`);
	}

	/**
	 * Send acknowledgment for server message (0x02)
	 */
	private sendAcknowledgment(sequenceNumber: number): void {
		const payload = Buffer.concat([
			Buffer.from([0x02]), // Server message acknowledgment type
			Buffer.from([sequenceNumber])
		]);

		this.sendPacket(payload);
		this.log(`Acknowledgment sent: seq=${sequenceNumber}`);
	}

	/**
	 * Send packet with BattlEye header and CRC32 checksum
	 */
	private sendPacket(payload: Buffer): void {
		if (!this.socket) {
			throw new RconError(
				RconErrorType.SOCKET_ERROR,
				'Socket not connected'
			);
		}

		// Calculate CRC32 checksum over [0xFF, ...payload]
		// The BattlEye protocol requires the separator byte to be included in CRC calculation
		const dataToChecksum = Buffer.concat([
			Buffer.from([0xFF]),
			payload
		]);
		const crc32 = this.calculateCRC32(dataToChecksum);

		// Build packet: 'B' | 'E' | CRC32 (4 bytes) | 0xFF | payload
		const packet = Buffer.alloc(7 + payload.length);
		packet.write('BE', 0, 'ascii');
		packet.writeUInt32LE(crc32, 2);
		packet.writeUInt8(0xFF, 6);
		payload.copy(packet, 7);

		this.socket.send(packet, this.port, this.host, (error) => {
			if (error) {
				this.log(`Failed to send packet: ${error.message}`);
				// Emit error event instead of throwing (callback context)
				this.emit('error', new RconError(
					RconErrorType.SOCKET_ERROR,
					`Failed to send packet: ${error.message}`,
					error
				));
			}
		});
	}

	/**
	 * Handle incoming message
	 */
	private handleMessage(msg: Buffer): void {
		// Validate packet header
		if (msg.length < 7) {
			this.log('Invalid packet: too short');
			return;
		}

		if (msg.toString('ascii', 0, 2) !== 'BE') {
			this.log('Invalid packet: wrong header');
			return;
		}

		// Extract CRC32 and payload
		const receivedCRC32 = msg.readUInt32LE(2);
		const separator = msg.readUInt8(6);

		if (separator !== 0xFF) {
			this.log('Invalid packet: wrong separator');
			return;
		}

		const payload = msg.subarray(7);

		// Verify CRC32 - must include the 0xFF separator byte
		const dataToVerify = msg.subarray(6); // [0xFF, ...payload]
		const calculatedCRC32 = this.calculateCRC32(dataToVerify);
		if (receivedCRC32 !== calculatedCRC32) {
			this.log(`Invalid packet: CRC32 mismatch (received: ${receivedCRC32}, calculated: ${calculatedCRC32})`);
			return;
		}

		// Parse payload
		const packetType = payload.readUInt8(0);

		switch (packetType) {
			case 0x00: // Login response
				this.handleLoginResponse(payload);
				break;
			case 0x01: // Command response
				this.handleCommandResponse(payload);
				break;
			case 0x02: // Server message
				this.handleServerMessage(payload);
				break;
			default:
				this.log(`Unknown packet type: ${packetType}`);
		}
	}

	/**
	 * Handle login response packet
	 */
	private handleLoginResponse(payload: Buffer): void {
		if (payload.length < 2) {
			this.log('Invalid login response: too short');
			return;
		}

		const success = payload.readUInt8(1) === 0x01;
		this.log(`Login response received: ${success ? 'success' : 'failed'}`);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const authHandler = (this as any)._authHandler;
		if (authHandler) {
			authHandler(success);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (this as any)._authHandler;
		}
	}

	/**
	 * Handle command response packet
	 */
	private handleCommandResponse(payload: Buffer): void {
		if (payload.length < 2) {
			this.log('Invalid command response: too short');
			return;
		}

		const sequenceNumber = payload.readUInt8(1);
		const response = payload.subarray(2).toString('utf8');

		this.log(`Command response received: seq=${sequenceNumber}, length=${response.length}`);

		const pending = this.pendingCommands.get(sequenceNumber);
		if (pending) {
			clearTimeout(pending.timeout);
			this.pendingCommands.delete(sequenceNumber);
			pending.resolve(response);
		}
	}

	/**
	 * Handle server message packet
	 */
	private handleServerMessage(payload: Buffer): void {
		if (payload.length < 2) {
			this.log('Invalid server message: too short');
			return;
		}

		const sequenceNumber = payload.readUInt8(1);
		const message = payload.subarray(2).toString('utf8');

		this.log(`Server message received: seq=${sequenceNumber}, msg="${message}"`);

		// Send acknowledgment
		this.sendAcknowledgment(sequenceNumber);

		// Emit server message event
		this.emit('serverMessage', message);
	}

	/**
	 * Wait for command response
	 */
	private async waitForResponse(sequenceNumber: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const timeoutHandle = setTimeout(() => {
				this.pendingCommands.delete(sequenceNumber);
				reject(new RconError(
					RconErrorType.TIMEOUT,
					'Command response timeout'
				));
			}, this.timeout);

			this.pendingCommands.set(sequenceNumber, {
				sequenceNumber,
				resolve,
				reject,
				timeout: timeoutHandle,
			});
		});
	}

	/**
	 * Start heartbeat to keep connection alive
	 * BattlEye requires a packet every 45 seconds
	 */
	private startHeartbeat(): void {
		this.stopHeartbeat(); // Clear any existing heartbeat

		this.heartbeatInterval = setInterval(() => {
			if (this.isAuthenticated()) {
				this.log('Sending heartbeat');
				const seqNum = this.getNextSequenceNumber();
				// Send heartbeat directly without waiting for response to avoid memory leaks
				// Heartbeats are fire-and-forget to prevent pendingCommands buildup
				const payload = Buffer.concat([
					Buffer.from([0x01]), // Command packet type
					Buffer.from([seqNum]),
					Buffer.from('', 'utf8') // Empty command
				]);
				try {
					this.sendPacket(payload);
				} catch (error) {
					this.log(`Heartbeat send failed: ${error}`);
					// Don't throw - heartbeat failures shouldn't crash the connection
				}
			}
		}, 45000); // 45 seconds
	}

	/**
	 * Stop heartbeat
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	/**
	 * Calculate CRC32 checksum
	 * Uses the standard CRC32 algorithm
	 */
	private calculateCRC32(data: Buffer): number {
		let crc = 0xFFFFFFFF;

		for (let i = 0; i < data.length; i++) {
			crc ^= data[i];
			for (let j = 0; j < 8; j++) {
				if (crc & 1) {
					crc = (crc >>> 1) ^ 0xEDB88320;
				} else {
					crc >>>= 1;
				}
			}
		}

		return (crc ^ 0xFFFFFFFF) >>> 0;
	}

	/**
	 * Get next sequence number (0-255)
	 */
	private getNextSequenceNumber(): number {
		const seq = this.sequenceNumber;
		this.sequenceNumber = (this.sequenceNumber + 1) % 256;
		return seq;
	}

	/**
	 * Set connection state
	 */
	private setState(state: ConnectionState): void {
		const oldState = this.state;
		this.state = state;
		if (oldState !== state) {
			this.emit('stateChange', state, oldState);
			this.log(`State changed: ${oldState} -> ${state}`);
		}
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		this.stopHeartbeat();

		if (this.socket) {
			this.socket.removeAllListeners();
			this.socket.close();
			this.socket = null;
		}

		// Reject all pending commands
		for (const pending of this.pendingCommands.values()) {
			clearTimeout(pending.timeout);
			pending.reject(new RconError(
				RconErrorType.CONNECTION_FAILED,
				'Connection closed'
			));
		}
		this.pendingCommands.clear();
	}

	/**
	 * Log debug message
	 */
	private log(message: string, data?: unknown): void {
		if (this.debug) {
			const timestamp = new Date().toISOString();
			console.log(`[${timestamp}] [BattlEye RCON] ${message}`, data || '');
		}
	}
}

/**
 * Internal interface for pending commands
 */
interface PendingCommand {
	sequenceNumber: number;
	resolve: (response: string) => void;
	reject: (error: Error) => void;
	timeout: NodeJS.Timeout;
}
