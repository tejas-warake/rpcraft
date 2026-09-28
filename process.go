package main

import (
	"bufio"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ProcessManager handles spawning and communicating with child processes
type ProcessManager struct {
	mu        sync.Mutex
	processes map[string]chan string
	app       *App // reference back to App for emitting events
}

// NewProcessManager creates a new ProcessManager
func NewProcessManager(app *App) *ProcessManager {
	return &ProcessManager{
		processes: make(map[string]chan string),
		app:       app,
	}
}

// StartProcess spawns a new child process and returns its ID
func (pm *ProcessManager) StartProcess(commandStr string) (string, error) {
	args := splitCommand(commandStr)
	if len(args) == 0 {
		return "", fmt.Errorf("empty command")
	}

	cmd := exec.Command(args[0], args[1:]...)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdin pipe: %w", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to spawn process: %w", err)
	}

	processID := uuid.New().String()
	msgChan := make(chan string, 32)

	pm.mu.Lock()
	pm.processes[processID] = msgChan
	pm.mu.Unlock()

	// Stdin writer goroutine
	go func() {
		defer stdin.Close()
		for msg := range msgChan {
			// The frontend formats the payload (e.g. adding Content-Length for LSP).
			// We just send the raw bytes.
			if !strings.HasSuffix(msg, "\n") && !strings.Contains(msg, "\r\n\r\n") {
				msg += "\n"
			}
			if _, err := io.WriteString(stdin, msg); err != nil {
				break
			}
		}
	}()

	// Stdout reader goroutine (handles both Content-Length headers and raw lines)
	go func() {
		reader := bufio.NewReader(stdout)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				break
			}
			trimmed := strings.TrimSpace(line)

			if strings.HasPrefix(trimmed, "Content-Length:") {
				// LSP-style framed message
				var contentLength int
				lenStr := strings.TrimSpace(trimmed[len("Content-Length:"):])
				if n, err := strconv.Atoi(lenStr); err == nil {
					contentLength = n
				}

				// Read remaining headers until empty line
				for {
					h, err := reader.ReadString('\n')
					if err != nil || strings.TrimSpace(h) == "" {
						break
					}
				}

				// Read exact content bytes
				if contentLength > 0 {
					buf := make([]byte, contentLength)
					if _, err := io.ReadFull(reader, buf); err == nil {
						runtime.EventsEmit(pm.app.ctx, "process_event", ProcessEvent{
							ProcessID: processID,
							EventType: "stdout",
							Data:      string(buf),
						})
					}
				}
			} else if trimmed != "" {
				// Raw JSON line
				runtime.EventsEmit(pm.app.ctx, "process_event", ProcessEvent{
					ProcessID: processID,
					EventType: "stdout",
					Data:      trimmed,
				})
			}
		}

		// Process exited
		runtime.EventsEmit(pm.app.ctx, "process_event", ProcessEvent{
			ProcessID: processID,
			EventType: "exit",
			Data:      "",
		})
	}()

	// Stderr reader goroutine
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			runtime.EventsEmit(pm.app.ctx, "process_event", ProcessEvent{
				ProcessID: processID,
				EventType: "stderr",
				Data:      scanner.Text(),
			})
		}
	}()

	return processID, nil
}

// SendProcessMessage sends a message to a running process's stdin
func (pm *ProcessManager) SendProcessMessage(processID string, message string) error {
	pm.mu.Lock()
	ch, ok := pm.processes[processID]
	pm.mu.Unlock()

	if !ok {
		return fmt.Errorf("process %s not found", processID)
	}

	ch <- message
	return nil
}

// splitCommand splits a command string into program and arguments, respecting quotes
func splitCommand(cmd string) []string {
	var args []string
	var current strings.Builder
	inQuote := false
	quoteChar := byte(0)

	for i := 0; i < len(cmd); i++ {
		c := cmd[i]
		switch {
		case inQuote:
			if c == quoteChar {
				inQuote = false
			} else {
				current.WriteByte(c)
			}
		case c == '"' || c == '\'':
			inQuote = true
			quoteChar = c
		case c == ' ' || c == '\t':
			if current.Len() > 0 {
				args = append(args, current.String())
				current.Reset()
			}
		default:
			current.WriteByte(c)
		}
	}
	if current.Len() > 0 {
		args = append(args, current.String())
	}
	return args
}
