# n8n-nodes-rcon

[![npm version](https://img.shields.io/npm/v/n8n-nodes-rcon.svg)](https://www.npmjs.com/package/n8n-nodes-rcon)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-rcon.svg)](https://www.npmjs.com/package/n8n-nodes-rcon)
[![codecov](https://codecov.io/gh/goevexx/n8n-nodes-rcon/branch/main/graph/badge.svg)](https://codecov.io/gh/goevexx/n8n-nodes-rcon)
[![Tests](https://github.com/goevexx/n8n-nodes-rcon/actions/workflows/test.yml/badge.svg)](https://github.com/goevexx/n8n-nodes-rcon/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n](https://img.shields.io/badge/n8n-community--node-orange)](https://n8n.io)

> A production-ready n8n community node for remote game server administration via RCON (Remote Console) protocol.

Control and manage your game servers directly from n8n workflows - execute commands, retrieve status, automate server management, and integrate with other n8n nodes for powerful automation scenarios.

[RCON Protocol](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol) is a network protocol for remote server administration in Source Engine games and other compatible game servers.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Via n8n Community Nodes](#via-n8n-community-nodes)
  - [Manual Installation (Self-Hosted)](#manual-installation-self-hosted)
  - [Verify Installation](#verify-installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
- [Supported Games & Servers](#supported-games--servers)
- [Configuration Options](#configuration-options)
- [Troubleshooting](#troubleshooting)
- [Security Warnings](#security-warnings)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [Project Status](#project-status)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Support](#support)
- [Roadmap](#roadmap)

---

## Features

- ✅ **Full RCON Protocol Support** - 100% compliant with Source RCON specification
- 🎮 **Wide Game Support** - Minecraft, Source games (CS:GO, CS2, TF2), Rust, ARK, and more
- 🔒 **Secure Authentication** - Password-based authentication with proper error handling
- 📦 **Multi-Packet Responses** - Correctly handles responses larger than 4KB
- ⚡ **Async Operation** - Non-blocking command execution
- 🛡️ **Type-Safe** - Built with TypeScript for reliability
- ⏱️ **Configurable Timeouts** - Customize connection and I/O timeouts
- 🎪 **Error Handling** - Comprehensive error types with `continueOnFail` support
- 🔄 **Workflow Integration** - Seamlessly integrate server management into n8n workflows

---

## Installation

### Via n8n Community Nodes

1. In n8n, go to **Settings** > **Community Nodes**
2. Click **Install a community node**
3. Enter: `n8n-nodes-rcon`
4. Click **Install**

### Manual Installation (Self-Hosted)

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-rcon
```

Restart n8n to load the new nodes.

### Verify Installation

After installation, look for the **RCON** node in the nodes panel under the "Transform" category.

---

## Quick Start

### 1. Set Up Credentials

Before using the RCON node, you need to configure credentials:

1. Open any workflow in n8n
2. Add the **RCON** node to your workflow
3. Click on **Credential to connect with**
4. Click **Create New**
5. Fill in the connection details:
   - **Host**: Your server's IP address or hostname (e.g., `192.168.1.100` or `game.example.com`)
   - **Port**: RCON port (default: `25575` for Minecraft, `27015` for Source games)
   - **Password**: Your RCON password
   - **Connection Timeout**: Optional, defaults to 5000ms

![RCON Credentials Configuration](docs/images/credentials-setup.png)

### 2. Send Your First Command

1. Add the **RCON** node to your workflow
2. Select your configured credentials
3. Choose operation: **Send Command**
4. Enter a command (e.g., `list` for Minecraft)
5. Execute the workflow

![RCON Node Configuration](docs/images/node-configuration.png)

---

## Usage Examples

### Example 1: Monitor Server Status

Create a workflow that checks your Minecraft server status every 5 minutes:

```
Schedule Trigger (every 5 min)
  → RCON: "list"
  → IF (player count > 0)
    → Send notification to Discord/Slack
```

### Example 2: Automated Server Announcements

Announce scheduled maintenance to players:

```
Schedule Trigger (specific time)
  → RCON: "say Server restart in 30 minutes"
  → Wait 15 minutes
  → RCON: "say Server restart in 15 minutes"
  → Wait 10 minutes
  → RCON: "say Server restart in 5 minutes"
  → Wait 5 minutes
  → RCON: "stop"
```

### Example 3: Webhook-Triggered Commands

Allow external systems to trigger server commands:

```
Webhook Trigger
  → Function: Validate request
  → RCON: Execute command from webhook payload
  → Respond to webhook with result
```

### Example 4: Automated Backups

Create backups before executing maintenance commands:

```
Schedule Trigger
  → RCON: "save-off" (disable autosave)
  → RCON: "save-all" (force save)
  → Execute File Operations: Backup world files
  → RCON: "save-on" (enable autosave)
  → Send notification: Backup complete
```

### Example 5: Dynamic Server Management

Adjust server settings based on time of day:

```
Schedule Trigger (every hour)
  → Get Current Time
  → Switch (time-based):
    Case "Night (00:00-06:00)":
      → RCON: "difficulty peaceful"
    Case "Day (06:00-22:00)":
      → RCON: "difficulty normal"
    Case "Prime Time (18:00-22:00)":
      → RCON: "difficulty hard"
```

---

## Supported Games & Servers

### Minecraft (Java & Bedrock)
- **Default Port**: 25575
- **Example Commands**: `list`, `say <message>`, `give <player> <item>`, `weather clear`, `time set day`

### Source Engine Games
- **Default Port**: 27015
- **Supported**: CS:GO, Counter-Strike 2, Team Fortress 2, Garry's Mod, Left 4 Dead 2
- **Example Commands**: `status`, `changelevel <map>`, `kick <player>`, `sv_cheats <0|1>`

### Rust
- **Default Port**: 28016
- **Example Commands**: `save`, `quit`, `global.ban <player>`, `weather.rain 0`

### ARK: Survival Evolved
- **Default Port**: 27020
- **Example Commands**: `SaveWorld`, `DestroyWildDinos`, `Broadcast <message>`

### Other Compatible Games
Any game server that implements the Source RCON Protocol:
- Eco
- Conan Exiles
- 7 Days to Die
- Satisfactory
- Valheim (with mods)

---

## Configuration Options

### Node Parameters

#### Operation: Send Command

| Parameter | Description | Required |
|-----------|-------------|----------|
| **Command** | The RCON command to execute | Yes |

### Credential Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| **Host** | String | - | Server hostname or IP address |
| **Port** | Number | 25575 | RCON port number |
| **Password** | String | - | RCON password (stored encrypted) |
| **Connection Timeout** | Number | 5000 | Connection timeout in milliseconds |

---

## Troubleshooting

### Connection Issues

**Problem**: "Connection timeout" or "Connection failed"

**Solutions**:
- Verify the server is running and accessible
- Check firewall rules allow connections to the RCON port
- Ensure the RCON port is correctly configured in server.properties
- Try increasing the connection timeout in credentials

### Authentication Issues

**Problem**: "Authentication failed - incorrect password"

**Solutions**:
- Double-check your RCON password
- Ensure RCON is enabled on the server
- Check for typos or extra spaces in the password field
- Verify the password in your server configuration file

**Warning**: Multiple failed authentication attempts may result in a temporary IP ban!

### Command Execution Issues

**Problem**: "Command failed" or empty responses

**Solutions**:
- Verify the command syntax is correct for your game/server
- Check if you have permission to execute the command
- Some commands may not return output (this is normal)
- Use `continueOnFail` option if commands may legitimately fail

### Multi-Packet Response Issues

**Problem**: Truncated or incomplete responses

**Solution**: This node automatically handles multi-packet responses. If you're still experiencing issues:
- Increase the I/O timeout in your credentials
- Check your network connection stability
- Report the issue with server type and command details

### Node Not Appearing

**Problem**: RCON node doesn't appear after installation

**Solutions**:
- Restart n8n: `sudo systemctl restart n8n`
- Clear browser cache and reload
- Check n8n logs for installation errors: `~/.n8n/logs/`
- Reinstall the node: `npm uninstall n8n-nodes-rcon && npm install n8n-nodes-rcon`

### Getting Help

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/goevexx/n8n-nodes-rcon/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/goevexx/n8n-nodes-rcon/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/goevexx/n8n-nodes-rcon/discussions)
- 📖 **n8n Community**: [n8n Forum](https://community.n8n.io)

---

## Security Warnings

### Critical Security Considerations

#### 1. Unencrypted Connection
The RCON protocol transmits passwords **in plaintext** over TCP. For production environments:
- ✅ Use VPN connections to your game servers
- ✅ Use SSH tunneling for remote connections
- ✅ Keep RCON ports firewalled and only accessible from trusted IPs
- ❌ Never expose RCON ports directly to the internet

#### 2. IP Ban Risk
After multiple failed authentication attempts, the server will ban your IP address:
- Use strong, correct passwords
- Test credentials before deploying workflows
- Consider the impact of workflow errors that retry authentication

#### 3. Strong Passwords
- Use long, random passwords (20+ characters)
- Never use the same password as other server credentials
- Store passwords securely in n8n (they are encrypted at rest)
- Rotate passwords regularly

#### 4. Command Validation
- Validate and sanitize any user input used in commands
- Be cautious with commands that can modify server state
- Use workflow permissions to restrict who can execute server commands
- Log all command executions for audit purposes

#### 5. n8n Security Best Practices
- Restrict access to n8n workflows containing RCON nodes
- Use webhook authentication for external triggers
- Enable n8n audit logging
- Keep n8n and this node updated to the latest versions

---

## Error Handling

The RCON node supports n8n's `continueOnFail` option. When enabled, execution errors won't stop the workflow:

```json
// Success response
{
  "command": "list",
  "response": "There are 3 players online: Alice, Bob, Charlie",
  "success": true,
  "timestamp": "2025-10-30T22:15:00.000Z"
}

// Error response (with continueOnFail enabled)
{
  "error": "Connection timeout",
  "success": false,
  "timestamp": "2025-10-30T22:15:00.000Z"
}
```

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue with details about the problem
2. **Suggest Features**: Share your ideas for improvements
3. **Submit Pull Requests**: Follow the development setup below

### Development Setup

```bash
# Clone the repository
git clone https://github.com/goevexx/n8n-nodes-rcon.git
cd n8n-nodes-rcon

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint and format code
npm run lint
npm run format
```

### Project Structure

```
n8n-nodes-rcon/
├── credentials/
│   └── RconApi.credentials.ts    # Credential type definition
├── nodes/
│   └── Rcon/
│       ├── Rcon.node.ts         # Main node implementation
│       ├── RconClient.ts        # RCON protocol client
│       ├── RconTypes.ts         # TypeScript types
│       ├── helpers.ts           # Helper functions
│       └── rcon.svg             # Node icon
├── src/
│   └── index.ts                 # Package exports
├── dist/                        # Compiled JavaScript (generated)
├── docs/
│   └── images/                  # Documentation screenshots
└── README.md
```

---

## Project Status

This project is actively maintained. Current focus:

- ✅ Core RCON protocol implementation complete
- ✅ Full multi-packet response handling
- ✅ Production-ready error handling
- 🔄 Adding more usage examples
- 🔄 Expanding test coverage
- 📋 Planning additional features

See [ROADMAP.md](#roadmap) for detailed plans.

---

## License

[MIT](LICENSE) - Free to use, modify, and distribute.

---

## Acknowledgments

- Built for the [n8n](https://n8n.io/) community
- Based on [Source RCON Protocol Specification](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol) by Valve
- Thanks to all contributors and users

---

## Support

Need help? Here's how to get support:

- 📖 [GitHub Repository](https://github.com/goevexx/n8n-nodes-rcon)
- 🐛 [Report an Issue](https://github.com/goevexx/n8n-nodes-rcon/issues)
- 💬 [n8n Community Forum](https://community.n8n.io/)

---

## Roadmap

Future enhancements being considered:

- [ ] Additional operations (batch commands, server info)
- [ ] Connection pooling for high-volume workflows
- [ ] UDP RCON support (for GoldSrc games)
- [ ] Challenge protocol support
- [ ] Retry mechanism with exponential backoff
- [ ] Server status monitoring operation
- [ ] Multi-server operation support

---

<div align="center">

**Built with ❤️ for the n8n and gaming communities**

[Documentation](https://github.com/goevexx/n8n-nodes-rcon) · [Issues](https://github.com/goevexx/n8n-nodes-rcon/issues) · [Discussions](https://github.com/goevexx/n8n-nodes-rcon/discussions)

</div>
