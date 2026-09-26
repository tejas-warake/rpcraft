# RPCraft

> A universal, protocol-aware API client for Remote Procedure Calls

RPCraft is a dedicated developer tool designed from the ground up to test, debug, and organize Remote Procedure Calls (RPC).

## Getting Started

### Launching Development

To start the app in development mode, ensure you have Node.js and Rust installed, then run:

```bash
npm install
npm run tauri dev
```

### How to Use (Testing Local `stdio` Servers)

1. **Open a Tab:** Launch RPCraft and click the `+` button in the top bar to create a new request tab.
2. **Select Protocol:** In the top toolbar, select **LSP**, **MCP**, or **JSON-RPC**. The transport will automatically switch to **stdio**.
3. **Set the Target:** In the input box next to the protocol, enter the CLI command to launch your local server.
   - *Example:* `python /path/to/server.py`
   - *Example:* `typescript-language-server --stdio`
4. **Prepare Payload:** Enter your JSON payload in the **Body** text editor.
5. **Send Request:** Click the **Send** button. This will natively launch your local process in the background.
6. **View Streams:** Open the **Stream Panel** (bottom right) to monitor interleaved requests, responses, and server-sent asynchronous notifications in real time.

### Packaging & Distribution

To build the optimized, standalone executable for your current operating system, run:

```bash
npm run tauri build
```

**Note on Cross-Compilation:** Tauri natively builds for the OS you are currently running it on (e.g., running the build command on Linux creates `.deb` and `AppImage` files). To easily package for Windows (`.exe` or `.msi`) and macOS (`.dmg`), it is highly recommended to use [Tauri GitHub Actions](https://v2.tauri.app/distribute/pipelines/) to automate cross-platform releases.
