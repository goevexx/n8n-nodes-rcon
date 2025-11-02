/**
 * RCON Protocol Types and Constants
 */

/**
 * RCON Packet Types according to Source RCON Protocol
 */
export enum PacketType {
    /** Authentication request */
    SERVERDATA_AUTH = 3,
    /** Command execution request */
    SERVERDATA_EXECCOMMAND = 2,
    /** Response from server (auth response or command response) */
    SERVERDATA_RESPONSE_VALUE = 0,
}

/**
 * RCON Protocol Constants
 */
export const RCON_CONSTANTS = {
    /** Minimum packet size in bytes */
    MIN_PACKET_SIZE: 10,
    /** Maximum packet size in bytes (4096 + header) */
    MAX_PACKET_SIZE: 4110,
    /** Maximum response body size */
    MAX_RESPONSE_SIZE: 4096,
    /** Size of packet header (Size + ID + Type) */
    HEADER_SIZE: 12,
    /** Size of padding at end of packet */
    PADDING_SIZE: 2,
    /** Authentication failure ID */
    AUTH_FAILURE_ID: -1,
} as const;

/**
 * Raw RCON packet structure
 */
export interface RconPacket {
    /** Packet size (excluding this field) */
    size: number;
    /** Request/Response ID */
    id: number;
    /** Packet type */
    type: PacketType;
    /** Packet body (command or response) */
    body: string;
}

/**
 * RCON Protocol Types
 */
export enum RconProtocol {
    /** Source RCON Protocol (TCP) - Used by Minecraft, CS:GO, ARK, etc. */
    SOURCE = 'source',
    /** BattlEye RCON Protocol (UDP) - Used by DayZ, ARMA 2/3 */
    BATTLEYE = 'battleye',
}

/**
 * RCON client configuration options
 */
export interface RconOptions {
    /** Server hostname or IP */
    host: string;
    /** Server port (default: 25575) */
    port?: number;
    /** RCON password */
    password: string;
    /** RCON Protocol type (default: 'source') */
    protocol?: RconProtocol | string;
    /** Connection timeout in ms (default: 5000) */
    timeout?: number;
    /** Read/Write timeout in ms (default: 5000) */
    ioTimeout?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** Character encoding (default: 'ascii') */
    encoding?: BufferEncoding;
}

/**
 * RCON connection state
 */
export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    AUTHENTICATING = 'authenticating',
    AUTHENTICATED = 'authenticated',
    ERROR = 'error',
}

/**
 * RCON error types
 */
export enum RconErrorType {
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    AUTH_FAILED = 'AUTH_FAILED',
    TIMEOUT = 'TIMEOUT',
    INVALID_PACKET = 'INVALID_PACKET',
    NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
    SOCKET_ERROR = 'SOCKET_ERROR',
    COMMAND_FAILED = 'COMMAND_FAILED',
}

/**
 * Custom RCON Error class
 */
export class RconError extends Error {
    constructor(
        public type: RconErrorType,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'RconError';
        Object.setPrototypeOf(this, RconError.prototype);
    }
}
