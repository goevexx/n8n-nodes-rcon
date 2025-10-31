/**
 * RCON Client Usage Examples
 */

import { RconClient, RconError, RconErrorType, ConnectionState } from './index';

/**
 * Example 1: Basic Usage
 */
async function basicUsage() {
    console.log('=== Example 1: Basic Usage ===\n');
    
    const rcon = new RconClient({
        host: '192.168.1.100',
        port: 25575,
        password: 'my_rcon_password',
        timeout: 5000,
    });

    try {
        // Connect and authenticate
        await rcon.connect();
        console.log('Connected and authenticated!');

        // Execute a command
        const response = await rcon.execute('status');
        console.log('Server Status:\n', response);

        // Disconnect
        await rcon.disconnect();
        console.log('Disconnected');
    } catch (error) {
        if (error instanceof RconError) {
            console.error(`RCON Error [${error.type}]:`, error.message);
        } else {
            console.error('Error:', error);
        }
    }
}

/**
 * Example 2: Multiple Commands
 */
async function multipleCommands() {
    console.log('\n=== Example 2: Multiple Commands ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'password123',
    });

    try {
        await rcon.connect();

        // Execute multiple commands
        const commands = ['list', 'time query daytime', 'weather query'];
        
        for (const command of commands) {
            console.log(`\nExecuting: ${command}`);
            const response = await rcon.execute(command);
            console.log(`Response: ${response}`);
        }

        await rcon.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 3: Event Handling
 */
async function eventHandling() {
    console.log('\n=== Example 3: Event Handling ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'password123',
        debug: true, // Enable debug logging
    });

    // Listen to events
    rcon.on('stateChange', (newState: ConnectionState, oldState: ConnectionState) => {
        console.log(`State changed: ${oldState} -> ${newState}`);
    });

    rcon.on('authenticated', () => {
        console.log('Successfully authenticated!');
    });

    rcon.on('disconnected', () => {
        console.log('Disconnected from server');
    });

    rcon.on('error', (error: RconError) => {
        console.error('RCON Error:', error.message);
    });

    rcon.on('close', (hadError: boolean) => {
        console.log(`Connection closed${hadError ? ' with error' : ''}`);
    });

    try {
        await rcon.connect();
        await rcon.execute('help');
        await rcon.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 4: Error Handling
 */
async function errorHandling() {
    console.log('\n=== Example 4: Error Handling ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'wrong_password', // Intentionally wrong
    });

    try {
        await rcon.connect();
    } catch (error) {
        if (error instanceof RconError) {
            switch (error.type) {
                case RconErrorType.AUTH_FAILED:
                    console.error('Authentication failed - check your password');
                    break;
                case RconErrorType.CONNECTION_FAILED:
                    console.error('Could not connect to server');
                    break;
                case RconErrorType.TIMEOUT:
                    console.error('Connection timed out');
                    break;
                default:
                    console.error('RCON Error:', error.message);
            }
        } else {
            console.error('Unexpected error:', error);
        }
    }
}

/**
 * Example 5: Long-Running Connection
 */
async function longRunningConnection() {
    console.log('\n=== Example 5: Long-Running Connection ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'password123',
    });

    try {
        await rcon.connect();
        console.log('Connected - keeping connection alive...');

        // Execute commands periodically
        const interval = setInterval(async () => {
            try {
                if (rcon.isAuthenticated()) {
                    const response = await rcon.execute('list');
                    console.log(`[${new Date().toISOString()}] Players online:`, response);
                }
            } catch (error) {
                console.error('Command failed:', error);
            }
        }, 30000); // Every 30 seconds

        // Run for 5 minutes then disconnect
        setTimeout(async () => {
            clearInterval(interval);
            await rcon.disconnect();
            console.log('Disconnected after 5 minutes');
        }, 300000);

    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 6: Minecraft-Specific Commands
 */
async function minecraftCommands() {
    console.log('\n=== Example 6: Minecraft Commands ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'minecraft_password',
    });

    try {
        await rcon.connect();

        // Get server status
        console.log('\n--- Server List ---');
        const players = await rcon.execute('list');
        console.log(players);

        // Set time to day
        console.log('\n--- Setting time to day ---');
        await rcon.execute('time set day');
        console.log('Time set to day');

        // Clear weather
        console.log('\n--- Clearing weather ---');
        await rcon.execute('weather clear');
        console.log('Weather cleared');

        // Give item to player (example)
        // await rcon.execute('give PlayerName diamond 64');

        // Ban player (example)
        // await rcon.execute('ban PlayerName Cheating');

        await rcon.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 7: Source Game Commands (CS:GO, TF2, etc.)
 */
async function sourceGameCommands() {
    console.log('\n=== Example 7: Source Game Commands ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 27015, // Source games typically use 27015
        password: 'source_password',
    });

    try {
        await rcon.connect();

        // Get server status
        console.log('\n--- Server Status ---');
        const status = await rcon.execute('status');
        console.log(status);

        // Get player list
        console.log('\n--- Players ---');
        const players = await rcon.execute('users');
        console.log(players);

        // Change map (example)
        // await rcon.execute('changelevel de_dust2');

        // Kick player (example)
        // await rcon.execute('kick PlayerName');

        // Set server cvar (example)
        // await rcon.execute('sv_cheats 0');

        await rcon.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 8: Connection State Checking
 */
async function stateChecking() {
    console.log('\n=== Example 8: Connection State Checking ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'password123',
    });

    console.log('Initial state:', rcon.getState());
    console.log('Is authenticated?', rcon.isAuthenticated());

    try {
        console.log('\nConnecting...');
        await rcon.connect();
        
        console.log('After connect - state:', rcon.getState());
        console.log('Is authenticated?', rcon.isAuthenticated());

        if (rcon.isAuthenticated()) {
            await rcon.execute('help');
        }

        console.log('\nDisconnecting...');
        await rcon.disconnect();
        
        console.log('After disconnect - state:', rcon.getState());
        console.log('Is authenticated?', rcon.isAuthenticated());
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 9: Wrapper Function for Safe Execution
 */
async function safeExecute(
    host: string,
    port: number,
    password: string,
    command: string
): Promise<string | null> {
    const rcon = new RconClient({ host, port, password });
    
    try {
        await rcon.connect();
        const response = await rcon.execute(command);
        await rcon.disconnect();
        return response;
    } catch (error) {
        console.error('RCON command failed:', error);
        return null;
    }
}

async function wrapperExample() {
    console.log('\n=== Example 9: Wrapper Function ===\n');
    
    const response = await safeExecute(
        'localhost',
        25575,
        'password123',
        'status'
    );
    
    if (response) {
        console.log('Command successful:', response);
    } else {
        console.log('Command failed');
    }
}

/**
 * Example 10: Promise.race for Timeout
 */
async function customTimeout() {
    console.log('\n=== Example 10: Custom Timeout ===\n');
    
    const rcon = new RconClient({
        host: 'localhost',
        port: 25575,
        password: 'password123',
    });

    try {
        await rcon.connect();

        // Race between command execution and custom timeout
        const response = await Promise.race([
            rcon.execute('status'),
            new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error('Custom timeout')), 2000)
            )
        ]);

        console.log('Response:', response);
        await rcon.disconnect();
    } catch (error) {
        console.error('Error:', error);
        await rcon.disconnect();
    }
}

// Run examples (uncomment the ones you want to try)
// Note: You'll need a running RCON server to test these!

async function main() {
    console.log('RCON Client Examples\n');
    console.log('Note: These examples require a running RCON server.');
    console.log('Update the host, port, and password in each example.\n');
    
    // Uncomment to run:
    // await basicUsage();
    // await multipleCommands();
    // await eventHandling();
    // await errorHandling();
    // await longRunningConnection();
    // await minecraftCommands();
    // await sourceGameCommands();
    // await stateChecking();
    // await wrapperExample();
    // await customTimeout();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

export {
    basicUsage,
    multipleCommands,
    eventHandling,
    errorHandling,
    longRunningConnection,
    minecraftCommands,
    sourceGameCommands,
    stateChecking,
    wrapperExample,
    customTimeout,
};
