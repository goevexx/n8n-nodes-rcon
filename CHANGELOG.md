## [0.2.0](https://github.com/goevexx/n8n-nodes-rcon/compare/v0.1.1...v0.2.0) (2025-11-02)


### Features

* add BattlEye RCON protocol support (UDP) ([88aa042](https://github.com/goevexx/n8n-nodes-rcon/commit/88aa042a82eaa46d4d059dc7647d78cffc239b9b)), closes [#8](https://github.com/goevexx/n8n-nodes-rcon/issues/8)


### Bug Fixes

* add 100ms delay after server listen to ensure readiness ([16112f8](https://github.com/goevexx/n8n-nodes-rcon/commit/16112f8efb122a6032277c9494931ce9ecef624f))
* address critical memory leak and error handling issues ([4a492fd](https://github.com/goevexx/n8n-nodes-rcon/commit/4a492fd2281e2a59761bf16a8b2dc723e3d27d76)), closes [#13](https://github.com/goevexx/n8n-nodes-rcon/issues/13)
* **battleye:** include 0xFF separator byte in CRC32 calculation ([df2789e](https://github.com/goevexx/n8n-nodes-rcon/commit/df2789e60f8fdade05534f15aa89e0ad88702321))
* correct n8n data volume path for root user ([c4c2cff](https://github.com/goevexx/n8n-nodes-rcon/commit/c4c2cffdb825b95ca15a53db803555cd4f070110))
* make Claude Code Review workflow optional ([1d50d0d](https://github.com/goevexx/n8n-nodes-rcon/commit/1d50d0ddf89e087221a75babe67c4e8156ff3109))
* mount RCON node like real community package ([7e16605](https://github.com/goevexx/n8n-nodes-rcon/commit/7e166056278ce2b2c00c009de2811ad47986f6a0))
* remove debug console.log statements from production code ([eda6d8c](https://github.com/goevexx/n8n-nodes-rcon/commit/eda6d8c3a1052353a73f1758f7a02b80f63cd825))
* remove invalid HTTP credential test configuration ([f6eb599](https://github.com/goevexx/n8n-nodes-rcon/commit/f6eb599996d033a5ce2eaf94f5a9f8f30884bf14))
* skip integration tests in CI, add testing documentation ([5e408dd](https://github.com/goevexx/n8n-nodes-rcon/commit/5e408dd4272bd9a214f8091d41e0acb7b13b26d1))
* **tests:** force Jest to exit after tests complete ([36aef31](https://github.com/goevexx/n8n-nodes-rcon/commit/36aef318224ded68bc6d4baaaa9db8aa90e08cb3))
* use incrementing ports instead of random ports for tests ([3188c1f](https://github.com/goevexx/n8n-nodes-rcon/commit/3188c1f690428c46a5a7b6a7fe80ddda657dcbe5))

