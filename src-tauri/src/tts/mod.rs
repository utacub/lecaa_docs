//! Native text-to-speech bridge. The web side (src/speech/native.ts) lists the voices installed
//! in the operating system and speaks through them; events come back as `tts-event`.
//!
//! Each platform backend owns its speech objects on one dedicated thread and receives
//! commands through a channel, so COM / Objective-C objects never cross threads.

use serde::{Deserialize, Serialize};
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
mod sapi;
#[cfg(any(target_os = "macos", target_os = "linux"))]
mod portable;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VoiceDto {
    pub id: String,
    pub name: String,
    pub lang: String,
    pub engine: String,
    pub offline: Option<bool>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct SpeakRequest {
    pub id: u64,
    pub voice: String,
    pub text: String,
    pub rate: f32,
    pub pitch: f32,
    pub volume: f32,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TtsEvent {
    pub id: u64,
    pub kind: &'static str, // "word" | "end" | "error"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub char_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub char_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl TtsEvent {
    #[cfg_attr(not(windows), allow(dead_code))]
    pub fn word(id: u64, index: usize, length: usize) -> Self {
        Self { id, kind: "word", char_index: Some(index), char_length: Some(length), message: None }
    }
    pub fn end(id: u64) -> Self {
        Self { id, kind: "end", char_index: None, char_length: None, message: None }
    }
    pub fn error(id: u64, message: String) -> Self {
        Self { id, kind: "error", char_index: None, char_length: None, message: Some(message) }
    }
}

pub enum Command {
    Voices(Sender<Vec<VoiceDto>>),
    Speak(SpeakRequest),
    Stop,
}

pub type Emit = Box<dyn Fn(TtsEvent) + Send + 'static>;

pub struct Tts(Mutex<Option<Sender<Command>>>);

impl Tts {
    pub fn new() -> Self {
        Tts(Mutex::new(None))
    }

    fn sender(&self, app: &AppHandle) -> Option<Sender<Command>> {
        let mut guard = self.0.lock().ok()?;
        if guard.is_none() {
            let (tx, rx) = channel::<Command>();
            let app = app.clone();
            let emit: Emit = Box::new(move |e| {
                let _ = app.emit("tts-event", e);
            });
            spawn_backend(rx, emit);
            *guard = Some(tx);
        }
        guard.clone()
    }
}

#[allow(unused_variables)]
fn spawn_backend(rx: std::sync::mpsc::Receiver<Command>, emit: Emit) {
    #[cfg(windows)]
    std::thread::spawn(move || sapi::run(rx, emit));
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    std::thread::spawn(move || portable::run(rx, emit));
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    std::thread::spawn(move || {
        // Mobile bridges (Android TextToSpeech, iOS AVSpeechSynthesizer) come in a later version.
        for cmd in rx {
            match cmd {
                Command::Voices(reply) => { let _ = reply.send(Vec::new()); }
                Command::Speak(req) => emit(TtsEvent::end(req.id)),
                Command::Stop => {}
            }
        }
    });
}

#[tauri::command]
pub async fn tts_voices(app: AppHandle, state: State<'_, Tts>) -> Result<Vec<VoiceDto>, String> {
    let tx = state.sender(&app).ok_or("TTS not available")?;
    let (reply_tx, reply_rx) = channel();
    tx.send(Command::Voices(reply_tx)).map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || reply_rx.recv_timeout(std::time::Duration::from_secs(15)))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn tts_speak(app: AppHandle, state: State<'_, Tts>, req: SpeakRequest) -> Result<(), String> {
    let tx = state.sender(&app).ok_or("TTS not available")?;
    tx.send(Command::Speak(req)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn tts_stop(app: AppHandle, state: State<'_, Tts>) -> Result<(), String> {
    let tx = state.sender(&app).ok_or("TTS not available")?;
    tx.send(Command::Stop).map_err(|e| e.to_string())
}
