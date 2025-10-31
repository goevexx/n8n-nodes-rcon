/**
 * RCON Client Unit Tests
 * 
 * Run with: npm test
 */

import { RconClient, RconError, RconErrorType, ConnectionState } from '../src/index';
import * as net from 'net';

describe('RconClient', () => {
    let mockServer: net.Server;
    let serverPort: number;
    let connectedSockets: net.Socket[] = [];
    const testPassword = 'test_password';

    // Setup mock RCON server before each test
    beforeEach((done) => {
        connectedSockets = [];
        mockServer = net.createServer((socket) => {
            connectedSockets.push(socket);
            socket.on('data', (data: Buffer) => {
                handleMockServerData(socket, data);
            });
            socket.on('close', () => {
                const index = connectedSockets.indexOf(socket);
                if (index > -1) {
                    connectedSockets.splice(index, 1);
                }
            });
        });

        mockServer.listen(0, 'localhost', () => {
            const address = mockServer.address() as net.AddressInfo;
            serverPort = address.port;
            done();
        });
    });

    // Cleanup after each test
    afterEach(async () => {
        // Close all connected sockets first
        connectedSockets.forEach(socket => {
            if (!socket.destroyed) {
                socket.destroy();
            }
        });
        connectedSockets = [];

        // Wait for sockets to fully close
        await new Promise(resolve => setTimeout(resolve, 200));

        // Then close the server
        await new Promise<void>((resolve) => {
            mockServer.close(() => {
                resolve();
            });
        });

        // Wait before next test to ensure port is fully freed
        await new Promise(resolve => setTimeout(resolve, 200));
    });

    describe('Constructor', () => {
        it('should create instance with required options', () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: 25575,
                password: 'test',
            });

            expect(rcon).toBeInstanceOf(RconClient);
            expect(rcon.getState()).toBe(ConnectionState.DISCONNECTED);
            expect(rcon.isAuthenticated()).toBe(false);
        });

        it('should use default port if not specified', () => {
            const rcon = new RconClient({
                host: 'localhost',
                password: 'test',
            });

            expect(rcon).toBeInstanceOf(RconClient);
        });
    });

    describe('Connection', () => {
        it('should connect successfully with correct password', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            await rcon.connect();
            expect(rcon.isAuthenticated()).toBe(true);
            expect(rcon.getState()).toBe(ConnectionState.AUTHENTICATED);

            await rcon.disconnect();
        }, 10000);

        it('should fail with incorrect password', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: 'wrong_password',
            });

            await expect(rcon.connect()).rejects.toThrow(RconError);
            expect(rcon.isAuthenticated()).toBe(false);
        }, 10000);

        it('should fail with connection timeout', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: 9999, // Non-existent port
                password: 'test',
                timeout: 1000,
            });

            await expect(rcon.connect()).rejects.toThrow(RconError);
        }, 10000);

        it('should emit authenticated event on successful auth', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            const authenticatedPromise = new Promise<void>((resolve) => {
                rcon.once('authenticated', () => resolve());
            });

            await rcon.connect();
            await authenticatedPromise;
            await rcon.disconnect();
        }, 10000);
    });

    describe('Command Execution', () => {
        let rcon: RconClient;

        beforeEach(async () => {
            rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });
            await rcon.connect();
        });

        afterEach(async () => {
            if (rcon.isAuthenticated()) {
                await rcon.disconnect();
            }
        });

        it('should execute command successfully', async () => {
            const response = await rcon.execute('test_command');
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        }, 10000);

        it('should handle empty response', async () => {
            const response = await rcon.execute('empty');
            expect(response).toBe('');
        }, 10000);

        it('should fail when not authenticated', async () => {
            const unauthRcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            await expect(unauthRcon.execute('test')).rejects.toThrow(RconError);
        }, 10000);

        it('should handle multiple sequential commands', async () => {
            const response1 = await rcon.execute('command1');
            const response2 = await rcon.execute('command2');
            const response3 = await rcon.execute('command3');

            expect(response1).toBeDefined();
            expect(response2).toBeDefined();
            expect(response3).toBeDefined();
        }, 10000);
    });

    describe('Disconnection', () => {
        it('should disconnect successfully', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            await rcon.connect();
            expect(rcon.isAuthenticated()).toBe(true);

            await rcon.disconnect();
            expect(rcon.getState()).toBe(ConnectionState.DISCONNECTED);
            expect(rcon.isAuthenticated()).toBe(false);
        }, 10000);

        it('should emit disconnected event', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            const disconnectedPromise = new Promise<void>((resolve) => {
                rcon.once('disconnected', () => resolve());
            });

            await rcon.connect();
            await rcon.disconnect();
            await disconnectedPromise;
        }, 10000);
    });

    describe('State Management', () => {
        it('should track state changes correctly', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            const states: ConnectionState[] = [];
            rcon.on('stateChange', (newState: ConnectionState) => {
                states.push(newState);
            });

            expect(rcon.getState()).toBe(ConnectionState.DISCONNECTED);

            await rcon.connect();
            expect(rcon.getState()).toBe(ConnectionState.AUTHENTICATED);
            expect(states).toContain(ConnectionState.CONNECTING);
            expect(states).toContain(ConnectionState.CONNECTED);
            expect(states).toContain(ConnectionState.AUTHENTICATING);
            expect(states).toContain(ConnectionState.AUTHENTICATED);

            await rcon.disconnect();
            expect(rcon.getState()).toBe(ConnectionState.DISCONNECTED);
        }, 10000);
    });

    describe('Error Handling', () => {
        it('should throw RconError with correct type', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: 'wrong',
            });

            try {
                await rcon.connect();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(RconError);
                expect((error as RconError).type).toBe(RconErrorType.AUTH_FAILED);
            }
        }, 10000);

        it('should handle socket close event', async () => {
            const rcon = new RconClient({
                host: 'localhost',
                port: serverPort,
                password: testPassword,
            });

            await rcon.connect();

            // Track if close event was emitted
            const closePromise = new Promise<boolean>((resolve) => {
                rcon.once('close', (hadError: boolean) => {
                    resolve(hadError);
                });
            });

            // Simulate socket close by destroying the connection
            if (connectedSockets.length > 0) {
                connectedSockets[0].destroy();
            }

            // Wait for close event
            const hadError = await closePromise;

            // Close event should have been emitted
            // hadError will be false for clean disconnect, true for error disconnect
            expect(typeof hadError).toBe('boolean');
        }, 10000);
    });
});

/**
 * Mock RCON server handler
 */
function handleMockServerData(socket: net.Socket, data: Buffer): void {
    let offset = 0;

    while (offset < data.length) {
        // Read size
        const size = data.readInt32LE(offset);
        offset += 4;

        if (offset + size > data.length) {
            break;
        }

        // Read ID and Type
        const id = data.readInt32LE(offset);
        const type = data.readInt32LE(offset + 4);
        const bodyLength = size - 10;
        const body = data.toString('ascii', offset + 8, offset + 8 + bodyLength);

        offset += size;

        // Handle auth packet
        if (type === 3) {
            if (body === 'test_password') {
                // Send successful auth response
                sendMockPacket(socket, id, 2, '');
            } else {
                // Send auth failure
                sendMockPacket(socket, -1, 2, '');
            }
        }
        // Handle command packet
        else if (type === 2) {
            // Send response - return empty string for 'empty' command
            const responseBody = body === 'empty' ? '' : `Response to: ${body}`;
            sendMockPacket(socket, id, 0, responseBody);
        }
        // Handle empty terminator
        else if (type === 0 && body === '') {
            sendMockPacket(socket, id, 0, '');
        }
    }
}

/**
 * Send a mock RCON packet
 */
function sendMockPacket(socket: net.Socket, id: number, type: number, body: string): void {
    const bodyBuffer = Buffer.from(body, 'ascii');
    const size = 4 + 4 + bodyBuffer.length + 2;
    const packet = Buffer.alloc(size + 4);

    let offset = 0;
    offset = packet.writeInt32LE(size, offset);
    offset = packet.writeInt32LE(id, offset);
    offset = packet.writeInt32LE(type, offset);
    offset += bodyBuffer.copy(packet, offset);
    offset = packet.writeInt8(0, offset);
    packet.writeInt8(0, offset);

    socket.write(packet);
}
