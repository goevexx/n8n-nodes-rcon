import { EventEmitter } from 'events';
import * as net from 'net';
import {
    RconOptions,
    RconPacket,
    PacketType,
    ConnectionState,
    RconError,
    RconErrorType,
    RCON_CONSTANTS,
} from './types';

/**
 * RCON Client - Full implementation of the Source RCON Protocol
 * 
 * Features:
 * - TCP/IP based communication
 * - Password authentication
 * - Command execution with multi-packet response handling
 * - Automatic reconnection support
 * - Event-based architecture
 * - Timeout handling
 * 
 * @example
 * ```typescript
 * const rcon = new RconClient({
 *   host: '192.168.1.100',
 *   port: 25575,
 *   password: 'my_password'
 * });
 * 
 * await rcon.connect();
 * const response = await rcon.execute('status');
 * console.log(response);
 * await rcon.disconnect();
 * ```
 */
export class RconClient extends EventEmitter {
    private socket: net.Socket | null = null;
    private state: ConnectionState = ConnectionState.DISCONNECTED;
    private requestId = 1;
    private pendingResponses: Map<number, PendingResponse> = new Map();
    private receiveBuffer: Buffer = Buffer.alloc(0);
    
    private readonly host: string;
    private readonly port: number;
    private readonly password: string;
    private readonly timeout: number;
    private readonly ioTimeout: number;
    private readonly debug: boolean;
    private readonly encoding: BufferEncoding;

    constructor(options: RconOptions) {
        super();
        
        this.host = options.host;
        this.port = options.port ?? 25575;
        this.password = options.password;
        this.timeout = options.timeout ?? 5000;
        this.ioTimeout = options.ioTimeout ?? 5000;
        this.debug = options.debug ?? false;
        this.encoding = options.encoding ?? 'ascii';
        
        this.log('RCON Client initialized', { host: this.host, port: this.port });
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
     * Connect to RCON server and authenticate
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
            // Create TCP connection
            await this.createConnection();
            
            // Authenticate
            await this.authenticate();
            
            this.setState(ConnectionState.AUTHENTICATED);
            this.emit('authenticated');
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

        const commandId = this.getNextRequestId();
        const terminatorId = this.getNextRequestId();
        this.log(`Sending command ID=${commandId}, terminator ID=${terminatorId}`);

        try {
            // Send command
            this.sendPacket(commandId, PacketType.SERVERDATA_EXECCOMMAND, command);

            // Send empty terminator packet (for multi-packet response handling)
            this.sendPacket(terminatorId, PacketType.SERVERDATA_RESPONSE_VALUE, '');

            // Wait for all responses
            const responses = await this.waitForResponse(commandId, terminatorId);
            
            const result = responses.join('');
            this.log(`Command executed successfully, response length: ${result.length}`);
            
            return result;
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
     * Create TCP connection to server
     */
    private async createConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            const timeoutHandle = setTimeout(() => {
                this.socket?.destroy();
                reject(new RconError(
                    RconErrorType.TIMEOUT,
                    `Connection timeout after ${this.timeout}ms`
                ));
            }, this.timeout);

            this.socket.once('connect', () => {
                clearTimeout(timeoutHandle);
                this.setState(ConnectionState.CONNECTED);
                this.setupSocketHandlers();
                this.log('TCP connection established');
                resolve();
            });

            this.socket.once('error', (error) => {
                clearTimeout(timeoutHandle);
                reject(new RconError(
                    RconErrorType.CONNECTION_FAILED,
                    `Failed to connect: ${error.message}`,
                    error
                ));
            });

            // Connect with explicit IPv4 family to avoid IPv6 issues
            this.socket.connect({
                port: this.port,
                host: this.host,
                family: 4, // Force IPv4
            });
        });
    }

    /**
     * Setup socket event handlers
     */
    private setupSocketHandlers(): void {
        if (!this.socket) return;

        this.socket.on('data', (data: Buffer) => {
            this.handleData(data);
        });

        this.socket.on('close', (hadError: boolean) => {
            this.log(`Socket closed${hadError ? ' with error' : ''}`);
            this.emit('close', hadError);
            if (this.state !== ConnectionState.DISCONNECTED) {
                this.setState(ConnectionState.DISCONNECTED);
                this.cleanup();
            }
        });

        this.socket.on('error', (error: Error) => {
            this.log(`Socket error: ${error.message}`);
            this.emit('error', new RconError(
                RconErrorType.SOCKET_ERROR,
                error.message,
                error
            ));
        });

        this.socket.on('timeout', () => {
            this.log('Socket timeout');
            this.socket?.destroy();
        });

        this.socket.setTimeout(this.ioTimeout);
    }

    /**
     * Authenticate with the server
     */
    private async authenticate(): Promise<void> {
        this.setState(ConnectionState.AUTHENTICATING);
        this.log('Authenticating...');

        const authId = this.getNextRequestId();
        
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingResponses.delete(authId);
                reject(new RconError(
                    RconErrorType.TIMEOUT,
                    'Authentication timeout'
                ));
            }, this.timeout);

            this.pendingResponses.set(authId, {
                id: authId,
                resolve: () => {
                    clearTimeout(timeoutHandle);
                    resolve();
                },
                reject: (error: Error) => {
                    clearTimeout(timeoutHandle);
                    reject(error);
                },
                responses: [],
                terminatorId: null,
            });

            this.sendPacket(authId, PacketType.SERVERDATA_AUTH, this.password);
        });
    }

    /**
     * Send a packet to the server
     */
    private sendPacket(id: number, type: PacketType, body: string): void {
        const bodyBuffer = Buffer.from(body, this.encoding);
        const size = 4 + 4 + bodyBuffer.length + 2; // ID + Type + Body + Padding
        
        if (size > RCON_CONSTANTS.MAX_PACKET_SIZE) {
            throw new RconError(
                RconErrorType.INVALID_PACKET,
                `Packet too large: ${size} bytes (max ${RCON_CONSTANTS.MAX_PACKET_SIZE})`
            );
        }

        const packet = Buffer.alloc(size + 4); // +4 for size field
        
        let offset = 0;
        offset = packet.writeInt32LE(size, offset);      // Size
        offset = packet.writeInt32LE(id, offset);        // ID
        offset = packet.writeInt32LE(type, offset);      // Type
        offset += bodyBuffer.copy(packet, offset);        // Body
        offset = packet.writeInt8(0, offset);            // Null terminator
        packet.writeInt8(0, offset);                      // Empty string terminator

        this.log(`Sending packet: ID=${id}, Type=${type}, Size=${size}, Body="${body.substring(0, 50)}${body.length > 50 ? '...' : ''}"`);

        if (!this.socket) {
            throw new RconError(
                RconErrorType.SOCKET_ERROR,
                'Socket not connected'
            );
        }

        this.socket.write(packet);
    }

    /**
     * Handle incoming data from server
     */
    private handleData(data: Buffer): void {
        // Append to receive buffer
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);

        // Try to parse packets from buffer
        while (this.receiveBuffer.length >= 4) {
            // Read packet size
            const size = this.receiveBuffer.readInt32LE(0);
            
            if (size < RCON_CONSTANTS.MIN_PACKET_SIZE || size > RCON_CONSTANTS.MAX_PACKET_SIZE) {
                this.log(`Invalid packet size: ${size}`);
                this.receiveBuffer = Buffer.alloc(0);
                break;
            }

            // Check if we have the full packet
            if (this.receiveBuffer.length < size + 4) {
                // Wait for more data
                break;
            }

            // Extract packet
            const packetBuffer = this.receiveBuffer.subarray(4, size + 4);
            this.receiveBuffer = this.receiveBuffer.subarray(size + 4);

            // Parse packet
            try {
                const packet = this.parsePacket(size, packetBuffer);
                this.handlePacket(packet);
            } catch (error) {
                this.log(`Error parsing packet: ${error}`);
            }
        }
    }

    /**
     * Parse a packet from buffer
     */
    private parsePacket(size: number, buffer: Buffer): RconPacket {
        const id = buffer.readInt32LE(0);
        const type = buffer.readInt32LE(4);
        
        // Body is everything between offset 8 and the padding (last 2 bytes)
        const bodyLength = size - 10; // size - (id + type + padding)
        const body = buffer.toString(this.encoding, 8, 8 + bodyLength);

        return { size, id, type, body };
    }

    /**
     * Handle a received packet
     */
    private handlePacket(packet: RconPacket): void {
        this.log(`Received packet: ID=${packet.id}, Type=${packet.type}, Size=${packet.size}, Body="${packet.body.substring(0, 50)}${packet.body.length > 50 ? '...' : ''}"`);
        this.log(`Pending responses: ${Array.from(this.pendingResponses.keys()).join(', ')}`);

        // Check for auth failure
        if (packet.id === RCON_CONSTANTS.AUTH_FAILURE_ID) {
            const pending = Array.from(this.pendingResponses.values())[0];
            if (pending) {
                this.pendingResponses.delete(pending.id);
                pending.reject(new RconError(
                    RconErrorType.AUTH_FAILED,
                    'Authentication failed - incorrect password'
                ));
            }
            return;
        }

        // Find pending response - check if this packet ID matches a command ID
        const pending = this.pendingResponses.get(packet.id);

        // If not found, check if this packet ID matches a terminator ID
        if (!pending) {
            for (const [commandId, p] of this.pendingResponses.entries()) {
                if (p.terminatorId && packet.id === p.terminatorId) {
                    // This is the terminator response
                    this.log(`Matched terminator packet ID=${packet.id} to command ID=${commandId}`);
                    this.pendingResponses.delete(commandId);
                    p.resolve(p.responses);
                    return;
                }
            }
            this.log(`No pending response found for packet ID ${packet.id}`);
            return;
        }

        // Handle authentication response
        if (this.state === ConnectionState.AUTHENTICATING) {
            this.pendingResponses.delete(packet.id);
            pending.resolve([]);
            return;
        }

        // Handle command response
        if (packet.type === PacketType.SERVERDATA_RESPONSE_VALUE) {
            // Check if this is the terminator
            if (pending.terminatorId && packet.id === pending.terminatorId) {
                // All responses received
                this.pendingResponses.delete(pending.id);
                pending.resolve(pending.responses);
            } else {
                // Regular response - add to responses
                pending.responses.push(packet.body);
            }
        }
    }

    /**
     * Wait for response to a command (with terminator support)
     */
    private async waitForResponse(commandId: number, terminatorId: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingResponses.delete(commandId);
                reject(new RconError(
                    RconErrorType.TIMEOUT,
                    'Command response timeout'
                ));
            }, this.ioTimeout);

            this.pendingResponses.set(commandId, {
                id: commandId,
                resolve: (responses: string[]) => {
                    clearTimeout(timeoutHandle);
                    resolve(responses);
                },
                reject: (error: Error) => {
                    clearTimeout(timeoutHandle);
                    reject(error);
                },
                responses: [],
                terminatorId: terminatorId,
            });
        });
    }

    /**
     * Get next request ID
     */
    private getNextRequestId(): number {
        const id = this.requestId++;
        if (this.requestId > 999999) {
            this.requestId = 1;
        }
        return id;
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
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.destroy();
            this.socket = null;
        }
        
        // Reject all pending responses
        for (const pending of this.pendingResponses.values()) {
            pending.reject(new RconError(
                RconErrorType.CONNECTION_FAILED,
                'Connection closed'
            ));
        }
        this.pendingResponses.clear();
        this.receiveBuffer = Buffer.alloc(0);
    }

    /**
     * Log debug message
     */
    private log(message: string, data?: unknown): void {
        if (this.debug) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [RCON] ${message}`, data || '');
        }
    }
}

/**
 * Internal interface for pending responses
 */
interface PendingResponse {
    id: number;
    resolve: (responses: string[]) => void;
    reject: (error: Error) => void;
    responses: string[];
    terminatorId: number | null;
}
