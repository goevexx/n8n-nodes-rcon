# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-30

### Added

#### Core Functionality
- **RCON Node**: Implemented full-featured RCON node for n8n
- **Send Command Operation**: Execute arbitrary RCON commands on game servers
- **RCON Client**: Complete Source RCON Protocol implementation
  - TCP/IP socket communication
  - Password authentication with error handling
  - Multi-packet response support for large responses (>4KB)
  - Configurable connection and I/O timeouts
  - Automatic request ID management

#### Credentials
- **RCON API Credentials**: Secure credential type for storing server connection details
  - Host (IP address or hostname)
  - Port (with sensible defaults: 25575 for Minecraft, 27015 for Source games)
  - Password (encrypted storage)
  - Connection timeout configuration

#### Error Handling
- **Comprehensive Error Types**:
  - `AUTH_FAILED`: Authentication failures (incorrect password)
  - `CONNECTION_FAILED`: Cannot connect to server
  - `TIMEOUT`: Operation timeout exceeded
  - `SOCKET_ERROR`: Socket-level errors
  - `COMMAND_FAILED`: Command execution errors
  - `INVALID_PACKET`: Protocol-level packet validation errors
  - `NOT_AUTHENTICATED`: Attempted command execution without authentication
- **continueOnFail Support**: Workflows can continue even if commands fail
- **Structured Error Responses**: JSON output with error details for workflow logic

#### Game Server Support
- **Minecraft**: Java Edition and Bedrock Edition support
- **Source Engine Games**: CS:GO, Counter-Strike 2, TF2, Garry's Mod, L4D2
- **Rust**: Full RCON command support
- **ARK: Survival Evolved**: Server administration commands
- **Universal Compatibility**: Any server implementing Source RCON Protocol

#### Developer Experience
- **TypeScript**: Full type safety with TypeScript implementation
- **Documentation**: Comprehensive README with:
  - Installation instructions (n8n UI and npm)
  - Quick start guide
  - 5 real-world workflow examples
  - Game-specific command references
  - Detailed troubleshooting section
  - Security best practices
  - Configuration reference
- **Code Quality**:
  - ESLint configuration for code consistency
  - Prettier for code formatting
  - Jest test framework setup
  - TypeScript strict mode enabled

#### Project Infrastructure
- **Build System**: TypeScript compilation with source maps
- **Package Configuration**:
  - n8n community node package structure
  - Peer dependencies for n8n-workflow and n8n-core
  - Proper exports for credentials and nodes
- **Git Repository**: Initialized with complete project history
- **License**: MIT License for open-source distribution

### Technical Details

#### Protocol Implementation
- **Packet Structure**: Proper size, ID, type, and body field handling
- **Padding**: Correct null terminator and padding byte implementation
- **Packet Validation**: Size limits (10 bytes min, 4110 bytes max)
- **Authentication Flow**: ID-based auth response validation
- **Multi-Packet Detection**: Terminator packet technique for complete responses
- **Buffer Management**: Efficient receive buffer with proper packet boundary detection

#### Network Handling
- **Connection States**: Proper state machine (disconnected → connecting → connected → authenticating → authenticated)
- **Timeout Management**: Separate configurable timeouts for connection and I/O operations
- **Socket Lifecycle**: Clean resource management with proper cleanup on errors
- **Encoding Support**: Configurable character encoding (default: ASCII)

#### Security Features
- **Encrypted Credential Storage**: n8n securely stores RCON passwords
- **Auth Failure Detection**: Immediate detection of incorrect passwords
- **Connection Validation**: Prevents commands before authentication
- **Error Isolation**: Failed operations don't leak sensitive information

### Documentation

- **README.md**: Complete user guide for n8n users
- **CHANGELOG.md**: Version history following Keep a Changelog format
- **Inline Code Documentation**: JSDoc comments for all public APIs
- **Type Definitions**: Full TypeScript declarations included

### Package Metadata

- **Name**: `n8n-nodes-rcon`
- **Version**: 0.1.0
- **Keywords**: rcon, source, valve, minecraft, game-server, remote-console, n8n, workflow, automation
- **Repository**: GitHub (placeholder URLs for user customization)
- **Node.js Version**: >=14.0.0
- **n8n API Version**: 1

### Known Limitations

- **Single Operation**: Currently supports only "Send Command" operation
- **No Connection Pooling**: Each command creates a new connection
- **No Retry Logic**: Failed commands require manual retry in workflow
- **No Batch Commands**: One command per node execution
- **No UDP Support**: Only TCP RCON protocol supported (Source RCON)
- **No Challenge Protocol**: Doesn't support challenge-response authentication
- **Screenshot Placeholders**: Documentation references screenshots not yet created

### Breaking Changes

None - this is the initial release.

### Migration Guide

Not applicable - initial release.

### Contributors

- Initial implementation and release

### Acknowledgments

- n8n community for workflow automation platform
- Valve Software for Source RCON Protocol specification
- Gaming community for feedback on RCON implementations

---

## [Unreleased]

### Planned Features
- Additional operations (batch commands, server info query)
- Connection pooling for better performance
- Retry mechanism with exponential backoff
- UDP RCON support for GoldSrc games
- Challenge protocol support
- Server status monitoring operation
- Multi-server operation support

---

**Note for Users**: This is the first stable release of n8n-nodes-rcon. While fully functional, we welcome feedback and bug reports to improve the node. Please report issues on GitHub.

**Note for Developers**: When contributing, please update this CHANGELOG following the Keep a Changelog format. Add your changes under the [Unreleased] section, and they will be moved to a version section upon release.
