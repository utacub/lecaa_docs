//! macOS (AVSpeechSynthesizer) and Linux (speech-dispatcher) through the `tts` crate.
//! The end of each utterance is detected by polling `is_speaking`, which avoids depending on
//! a run loop in this thread. Word boundaries are not reported by these backends yet.

use super::{Command, Emit, SpeakRequest, TtsEvent, VoiceDto};
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::time::{Duration, Instant};
use tts::{Features, Tts};

#[cfg(target_os = "macos")]
const ENGINE: &str = "macOS";
#[cfg(target_os = "linux")]
const ENGINE: &str = "Speech Dispatcher";

struct Current {
    id: u64,
    started: Instant,
    seen_speaking: bool,
    estimate: Duration,
}

fn scale(value: f32, min: f32, normal: f32, max: f32) -> f32 {
    // value: 1.0 = normal; 0.5 = slower/lower; 2.0 = faster/higher
    let v = if value >= 1.0 {
        normal + (max - normal) * ((value - 1.0) * 0.6).min(1.0)
    } else {
        normal - (normal - min) * ((1.0 - value) / 0.5 * 0.5).min(1.0)
    };
    v.clamp(min.min(max), max.max(min))
}

fn voices(tts: &Tts) -> Vec<VoiceDto> {
    tts.voices()
        .unwrap_or_default()
        .into_iter()
        .map(|v| VoiceDto {
            id: v.id(),
            name: v.name(),
            lang: v.language().to_string(),
            engine: ENGINE.to_string(),
            offline: if cfg!(target_os = "macos") { Some(true) } else { None },
        })
        .collect()
}

fn speak(tts: &mut Tts, req: &SpeakRequest) -> Result<(), String> {
    let features: Features = tts.supported_features();
    if features.voice {
        if let Some(v) = tts.voices().unwrap_or_default().into_iter().find(|v| v.id() == req.voice) {
            tts.set_voice(&v).map_err(|e| e.to_string())?;
        }
    }
    if features.rate {
        let r = scale(req.rate, tts.min_rate(), tts.normal_rate(), tts.max_rate());
        let _ = tts.set_rate(r);
    }
    if features.pitch {
        let p = scale(req.pitch, tts.min_pitch(), tts.normal_pitch(), tts.max_pitch());
        let _ = tts.set_pitch(p);
    }
    if features.volume {
        let (min, max) = (tts.min_volume(), tts.max_volume());
        let _ = tts.set_volume(min + (max - min) * req.volume.clamp(0.0, 1.0));
    }
    tts.speak(req.text.clone(), true).map(|_| ()).map_err(|e| e.to_string())
}

pub fn run(rx: Receiver<Command>, emit: Emit) {
    let mut tts = match Tts::default() {
        Ok(t) => t,
        Err(e) => {
            // No speech service: answer every request so the web side never waits forever.
            for cmd in rx {
                match cmd {
                    Command::Voices(reply) => { let _ = reply.send(Vec::new()); }
                    Command::Speak(req) => emit(TtsEvent::error(req.id, e.to_string())),
                    Command::Stop => {}
                }
            }
            return;
        }
    };
    let can_poll = tts.supported_features().is_speaking;
    let mut current: Option<Current> = None;

    loop {
        match rx.recv_timeout(Duration::from_millis(40)) {
            Ok(Command::Voices(reply)) => { let _ = reply.send(voices(&tts)); }
            Ok(Command::Speak(req)) => {
                if let Some(c) = current.take() { emit(TtsEvent::end(c.id)); }
                match speak(&mut tts, &req) {
                    Ok(()) => current = Some(Current {
                        id: req.id,
                        started: Instant::now(),
                        seen_speaking: false,
                        estimate: Duration::from_millis(600 + 90 * req.text.chars().count() as u64),
                    }),
                    Err(e) => emit(TtsEvent::error(req.id, e)),
                }
            }
            Ok(Command::Stop) => {
                let _ = tts.stop();
                if let Some(c) = current.take() { emit(TtsEvent::end(c.id)); }
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => return,
        }
        if let Some(c) = current.as_mut() {
            let elapsed = c.started.elapsed();
            let done = if can_poll {
                let speaking = tts.is_speaking().unwrap_or(false);
                if speaking { c.seen_speaking = true; }
                (!speaking && (c.seen_speaking || elapsed > Duration::from_millis(1500))) || elapsed > c.estimate * 4
            } else {
                elapsed > c.estimate
            };
            if done {
                emit(TtsEvent::end(c.id));
                current = None;
            }
        }
    }
}
