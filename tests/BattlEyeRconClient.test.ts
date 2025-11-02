import { BattlEyeRconClient } from '../src/BattlEyeRconClient';
import { ConnectionState } from '../src/types';
import * as dgram from 'dgram';

// Mock dgram
jest.mock('dgram');

describe('BattlEyeRconClient', () => {
	let client: BattlEyeRconClient;
	let mockSocket: any;

	beforeEach(() => {
		// Create mock socket
		mockSocket = {
			on: jest.fn(),
			send: jest.fn((buffer, port, host, callback) => {
				if (callback) callback();
			}),
			close: jest.fn(),
			removeAllListeners: jest.fn(),
		};

		(dgram.createSocket as jest.Mock).mockReturnValue(mockSocket);

		client = new BattlEyeRconClient({
			host: '127.0.0.1',
			port: 2305,
			password: 'testpassword',
			timeout: 1000,
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create client with correct defaults', () => {
			expect(client.getState()).toBe(ConnectionState.DISCONNECTED);
			expect(client.isAuthenticated()).toBe(false);
		});
	});

	describe('CRC32 Calculation', () => {
		it('should calculate CRC32 correctly', () => {
			// Access private method for testing
			const calculateCRC32 = (client as any).calculateCRC32.bind(client);

			// Test with known CRC32 values
			const testData1 = Buffer.from([0x00]); // Login packet type
			const crc1 = calculateCRC32(testData1);
			expect(typeof crc1).toBe('number');
			expect(crc1).toBeGreaterThan(0);

			// Test with different data produces different CRC
			const testData2 = Buffer.from([0x01]);
			const crc2 = calculateCRC32(testData2);
			expect(crc2).not.toBe(crc1);

			// Test consistency
			const crc1Again = calculateCRC32(testData1);
			expect(crc1Again).toBe(crc1);
		});

		it('should handle empty buffer', () => {
			const calculateCRC32 = (client as any).calculateCRC32.bind(client);
			const emptyBuffer = Buffer.alloc(0);
			const crc = calculateCRC32(emptyBuffer);
			expect(typeof crc).toBe('number');
		});
	});

	describe('Packet Building', () => {
		it('should build packet with correct header structure', () => {
			const sendPacket = (client as any).sendPacket.bind(client);
			const payload = Buffer.from([0x00, 0x74, 0x65, 0x73, 0x74]); // Login + "test"

			// Create socket first
			(client as any).socket = mockSocket;

			sendPacket(payload);

			expect(mockSocket.send).toHaveBeenCalled();
			const sentBuffer = mockSocket.send.mock.calls[0][0];

			// Check header: 'B' 'E' CRC32(4 bytes) 0xFF
			expect(sentBuffer[0]).toBe(0x42); // 'B'
			expect(sentBuffer[1]).toBe(0x45); // 'E'
			expect(sentBuffer[6]).toBe(0xFF); // separator
			expect(sentBuffer.length).toBe(7 + payload.length);
		});
	});

	describe('Sequence Number', () => {
		it('should increment sequence number', () => {
			const getNext = (client as any).getNextSequenceNumber.bind(client);

			expect(getNext()).toBe(0);
			expect(getNext()).toBe(1);
			expect(getNext()).toBe(2);
		});

		it('should wrap sequence number at 256', () => {
			const getNext = (client as any).getNextSequenceNumber.bind(client);

			// Set to 255
			(client as any).sequenceNumber = 255;

			expect(getNext()).toBe(255);
			expect(getNext()).toBe(0); // Should wrap to 0
			expect(getNext()).toBe(1);
		});
	});

	describe('State Management', () => {
		it('should change state correctly', () => {
			const setState = (client as any).setState.bind(client);
			const stateChangeSpy = jest.fn();

			client.on('stateChange', stateChangeSpy);

			setState(ConnectionState.CONNECTING);
			expect(client.getState()).toBe(ConnectionState.CONNECTING);
			expect(stateChangeSpy).toHaveBeenCalledWith(
				ConnectionState.CONNECTING,
				ConnectionState.DISCONNECTED
			);
		});

		it('should not emit event if state does not change', () => {
			const setState = (client as any).setState.bind(client);
			const stateChangeSpy = jest.fn();

			client.on('stateChange', stateChangeSpy);

			setState(ConnectionState.DISCONNECTED);
			expect(stateChangeSpy).not.toHaveBeenCalled();
		});
	});

	describe('Connection', () => {
		it('should throw error if already connected', async () => {
			(client as any).state = ConnectionState.CONNECTED;

			await expect(client.connect()).rejects.toThrow('Already connected or connecting');
		});

		it('should create UDP socket on connect', async () => {
			// Mock successful login response
			setTimeout(() => {
				const messageHandler = mockSocket.on.mock.calls.find(
					(call: any) => call[0] === 'message'
				)?.[1];

				if (messageHandler) {
					// Simulate login success response
					const response = Buffer.alloc(9);
					response.write('BE', 0, 'ascii');
					response.writeUInt32LE(0, 2); // CRC32 placeholder
					response.writeUInt8(0xFF, 6);
					response.writeUInt8(0x00, 7); // Login response type
					response.writeUInt8(0x01, 8); // Success

					// Calculate correct CRC32
					const payload = response.subarray(7);
					const crc32 = (client as any).calculateCRC32(payload);
					response.writeUInt32LE(crc32, 2);

					messageHandler(response);
				}
			}, 10);

			await client.connect();

			expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
			expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
			expect(client.isAuthenticated()).toBe(true);
		});
	});

	describe('Disconnect', () => {
		it('should cleanup resources on disconnect', async () => {
			(client as any).socket = mockSocket;
			(client as any).state = ConnectionState.AUTHENTICATED;

			await client.disconnect();

			expect(mockSocket.removeAllListeners).toHaveBeenCalled();
			expect(mockSocket.close).toHaveBeenCalled();
			expect(client.getState()).toBe(ConnectionState.DISCONNECTED);
		});
	});

	describe('Command Execution', () => {
		it('should throw error if not authenticated', async () => {
			await expect(client.execute('players')).rejects.toThrow('Not authenticated');
		});
	});
});
