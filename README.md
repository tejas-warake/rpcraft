# RPCraft

> A universal, protocol-aware API client for Remote Procedure Calls

RPCraft is a dedicated developer tool designed from the ground up to test, debug, and organize Remote Procedure Calls (RPC) using a fast Go backend and a responsive React frontend.

## Getting Started

### Prerequisites

You need the following installed:
- [Go](https://go.dev/) (v1.20+)
- [Node.js](https://nodejs.org/) (v18+)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

On Ubuntu/Debian, you will also need the required webview development libraries:
```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev
```

### Launching Development

To start the app in development mode with hot-reloading for the frontend:

```bash
# Add Wails to your path if you haven't
export PATH=$PATH:$(go env GOPATH)/bin

# If using Ubuntu 24.04 (WebKit2GTK 4.1):
wails dev -tags webkit2_41

# Otherwise:
wails dev
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
wails build -tags webkit2_41
```

**Note on Cross-Compilation:** Wails builds binaries for your target OS. You can cross-compile for Windows or MacOS by specifying the platform flag: `wails build -platform windows/amd64` (may require additional CGO cross-compilation toolchains depending on your host OS).
