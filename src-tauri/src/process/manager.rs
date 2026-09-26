use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, Mutex};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct ProcessEvent {
    pub process_id: String,
    pub event_type: String, // "stdout", "stderr", "error", "exit"
    pub data: String,
}

pub struct ProcessManager {
    processes: Arc<Mutex<HashMap<String, mpsc::Sender<String>>>>,
    app_handle: AppHandle,
}

impl ProcessManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            app_handle,
        }
    }

    pub async fn spawn(&self, command_str: &str) -> Result<String, String> {
        let mut args = shlex::split(command_str)
            .ok_or_else(|| "Failed to parse command string".to_string())?;
            
        if args.is_empty() {
            return Err("Empty command".to_string());
        }
        
        let program = args.remove(0);

        let mut child = Command::new(program)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn process: {}", e))?;

        let stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let process_id = Uuid::new_v4().to_string();
        let (tx, mut rx) = mpsc::channel::<String>(32);
        self.processes.lock().await.insert(process_id.clone(), tx);

        // Stdin writer task
        let mut stdin_writer = stdin;
        tokio::spawn(async move {
            while let Some(mut msg) = rx.recv().await {
                // The frontend formats the payload (e.g. adding Content-Length for LSP).
                // We just send the raw bytes.
                if !msg.ends_with('\n') && !msg.contains("\r\n\r\n") {
                    msg.push('\n');
                }
                
                if stdin_writer.write_all(msg.as_bytes()).await.is_err() {
                    break;
                }
                let _ = stdin_writer.flush().await;
            }
        });

        // Stdout reader task (handles both Content-Length headers and raw lines)
        let process_id_out = process_id.clone();
        let app_out = self.app_handle.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            
            loop {
                let mut header_line = String::new();
                match reader.read_line(&mut header_line).await {
                    Ok(0) => break, // EOF
                    Ok(_) => {
                        let line = header_line.trim();
                        if line.starts_with("Content-Length:") {
                            let mut content_length: Option<usize> = None;
                            if let Ok(len) = line[15..].trim().parse::<usize>() {
                                content_length = Some(len);
                            }
                            
                            // Keep reading headers until empty line
                            loop {
                                let mut h = String::new();
                                if reader.read_line(&mut h).await.unwrap_or(0) == 0 { break; }
                                if h.trim().is_empty() { break; }
                            }
                            
                            // Now read exact bytes
                            if let Some(len) = content_length {
                                let mut json_buf = vec![0; len];
                                if reader.read_exact(&mut json_buf).await.is_ok() {
                                    if let Ok(json_str) = String::from_utf8(json_buf) {
                                        let event = ProcessEvent {
                                            process_id: process_id_out.clone(),
                                            event_type: "stdout".to_string(),
                                            data: json_str,
                                        };
                                        let _ = app_out.emit("process_event", event);
                                    }
                                }
                            }
                        } else if !line.is_empty() {
                            let event = ProcessEvent {
                                process_id: process_id_out.clone(),
                                event_type: "stdout".to_string(),
                                data: line.to_string(),
                            };
                            let _ = app_out.emit("process_event", event);
                        }
                    }
                    Err(_) => break,
                }
            }
            
            let event = ProcessEvent {
                process_id: process_id_out.clone(),
                event_type: "exit".to_string(),
                data: "".to_string(),
            };
            let _ = app_out.emit("process_event", event);
        });

        // Stderr reader task
        let process_id_err = process_id.clone();
        let app_err = self.app_handle.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while let Ok(n) = reader.read_line(&mut line).await {
                if n == 0 { break; }
                let event = ProcessEvent {
                    process_id: process_id_err.clone(),
                    event_type: "stderr".to_string(),
                    data: line.trim().to_string(),
                };
                let _ = app_err.emit("process_event", event);
                line.clear();
            }
        });

        Ok(process_id)
    }

    pub async fn send_message(&self, process_id: &str, message: String) -> Result<(), String> {
        let processes = self.processes.lock().await;
        if let Some(tx) = processes.get(process_id) {
            tx.send(message).await.map_err(|e| format!("Failed to send: {}", e))
        } else {
            Err(format!("Process {} not found", process_id))
        }
    }
}
