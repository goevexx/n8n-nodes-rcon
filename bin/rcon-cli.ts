#!/usr/bin/env node

/**
 * RCON CLI Tool
 * 
 * A command-line interface for executing RCON commands
 * 
 * Usage:
 *   rcon-cli -h <host> -p <port> -P <password> -c <command>
 *   rcon-cli --interactive -h <host> -p <port> -P <password>
 */

import { RconClient, RconError } from '../src/index';
import * as readline from 'readline';

interface CliOptions {
    host: string;
    port: number;
    password: string;
    command?: string;
    interactive: boolean;
    debug: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions | null {
    const args = process.argv.slice(2);
    const options: Partial<CliOptions> = {
        port: 25575,
        interactive: false,
        debug: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '-h':
            case '--host':
                options.host = nextArg;
                i++;
                break;
            case '-p':
            case '--port':
                options.port = parseInt(nextArg, 10);
                i++;
                break;
            case '-P':
            case '--password':
                options.password = nextArg;
                i++;
                break;
            case '-c':
            case '--command':
                options.command = nextArg;
                i++;
                break;
            case '-i':
            case '--interactive':
                options.interactive = true;
                break;
            case '-d':
            case '--debug':
                options.debug = true;
                break;
            case '--help':
                showHelp();
                return null;
            default:
                console.error(`Unknown option: ${arg}`);
                showHelp();
                return null;
        }
    }

    if (!options.host || !options.password) {
        console.error('Error: Host and password are required!\n');
        showHelp();
        return null;
    }

    if (!options.interactive && !options.command) {
        console.error('Error: Either --command or --interactive is required!\n');
        showHelp();
        return null;
    }

    return options as CliOptions;
}

/**
 * Show help message
 */
function showHelp(): void {
    console.log(`
RCON CLI Tool - Execute RCON commands from the command line

Usage:
  rcon-cli [options]

Options:
  -h, --host <host>          Server hostname or IP (required)
  -p, --port <port>          Server port (default: 25575)
  -P, --password <password>  RCON password (required)
  -c, --command <command>    Command to execute
  -i, --interactive          Start interactive mode
  -d, --debug                Enable debug logging
  --help                     Show this help message

Examples:
  # Execute single command
  rcon-cli -h localhost -P mypassword -c "status"
  
  # Interactive mode
  rcon-cli -h localhost -P mypassword --interactive
  
  # Custom port
  rcon-cli -h 192.168.1.100 -p 27015 -P mypassword -c "help"
  
  # With debug logging
  rcon-cli -h localhost -P mypassword -c "list" --debug
`);
}

/**
 * Execute a single command
 */
async function executeCommand(options: CliOptions): Promise<void> {
    const rcon = new RconClient({
        host: options.host,
        port: options.port,
        password: options.password,
        debug: options.debug,
    });

    try {
        console.log(`Connecting to ${options.host}:${options.port}...`);
        await rcon.connect();
        console.log('Connected!\n');

        console.log(`Executing: ${options.command}\n`);
        const response = await rcon.execute(options.command!);
        console.log('Response:');
        console.log('─'.repeat(50));
        console.log(response || '(empty response)');
        console.log('─'.repeat(50));

        await rcon.disconnect();
    } catch (error) {
        if (error instanceof RconError) {
            console.error(`\n❌ RCON Error [${error.type}]: ${error.message}`);
        } else {
            console.error('\n❌ Error:', error);
        }
        process.exit(1);
    }
}

/**
 * Start interactive mode
 */
async function interactiveMode(options: CliOptions): Promise<void> {
    const rcon = new RconClient({
        host: options.host,
        port: options.port,
        password: options.password,
        debug: options.debug,
    });

    try {
        console.log(`Connecting to ${options.host}:${options.port}...`);
        await rcon.connect();
        console.log('✅ Connected and authenticated!\n');
        console.log('Type commands and press Enter to execute.');
        console.log('Type "exit" or "quit" to disconnect.\n');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'rcon> ',
        });

        rl.prompt();

        rl.on('line', async (line: string) => {
            const command = line.trim();

            if (!command) {
                rl.prompt();
                return;
            }

            if (command === 'exit' || command === 'quit') {
                console.log('\nDisconnecting...');
                await rcon.disconnect();
                console.log('Goodbye! 👋');
                rl.close();
                process.exit(0);
                return;
            }

            try {
                const response = await rcon.execute(command);
                console.log('');
                console.log(response || '(empty response)');
                console.log('');
            } catch (error) {
                if (error instanceof RconError) {
                    console.error(`❌ Error [${error.type}]: ${error.message}\n`);
                } else {
                    console.error('❌ Error:', error, '\n');
                }
            }

            rl.prompt();
        });

        rl.on('close', async () => {
            if (rcon.isAuthenticated()) {
                await rcon.disconnect();
            }
            process.exit(0);
        });

        // Handle Ctrl+C
        process.on('SIGINT', async () => {
            console.log('\n\nReceived SIGINT, disconnecting...');
            if (rcon.isAuthenticated()) {
                await rcon.disconnect();
            }
            process.exit(0);
        });

    } catch (error) {
        if (error instanceof RconError) {
            console.error(`\n❌ RCON Error [${error.type}]: ${error.message}`);
        } else {
            console.error('\n❌ Error:', error);
        }
        process.exit(1);
    }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    console.log('🎮 RCON CLI Tool\n');

    const options = parseArgs();
    if (!options) {
        process.exit(1);
    }

    if (options.interactive) {
        await interactiveMode(options);
    } else {
        await executeCommand(options);
    }
}

// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
