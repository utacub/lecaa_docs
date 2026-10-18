//! Windows voices through SAPI 5.
//!
//! Voices live in three registry categories, and a normal SAPI 5 program only sees the first:
//!  - SAPI 5 desktop voices (and adapters such as NaturalVoiceSAPIAdapter, SAPI Unifier)
//!  - OneCore voices installed from Settings > Time & language > Speech (e.g. Herena)
//!  - Microsoft Speech Platform 11 runtime voices (e.g. MSSpeech_TTS_ca-ES_Herena)
//! We enumerate each category with ISpObjectTokenCategory::SetId (no registry changes) and
//! speak with SpVoice. The 64-bit app sees 64-bit registrations; the 32-bit build sees the
//! 32-bit ones (for example the x86 Speech Platform runtime).
//! Word boundaries come from polling ISpVoice::GetStatus while speaking.

use super::{Command, Emit, SpeakRequest, TtsEvent, VoiceDto};
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::time::{Duration, Instant};
use windows::core::{HSTRING, PCWSTR, PWSTR};
use windows::Win32::Globalization::LCIDToLocaleName;
use windows::Win32::Media::Speech::{
    IEnumSpObjectTokens, ISpObjectToken, ISpObjectTokenCategory, ISpVoice, SpObjectToken, SpObjectTokenCategory,
    SpVoice, SPF_ASYNC, SPF_IS_XML, SPF_PURGEBEFORESPEAK, SPRS_DONE, SPVOICESTATUS,
};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_APARTMENTTHREADED};

const CATEGORIES: [(&str, &str); 3] = [
    (r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices", "Windows (SAPI 5)"),
    (r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices", "Windows (OneCore)"),
    (r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech Server\v11.0\Voices", "Microsoft Speech Platform"),
];

unsafe fn take_pwstr(p: PWSTR) -> String {
    if p.is_null() {
        return String::new();
    }
    let s = p.to_string().unwrap_or_default();
    CoTaskMemFree(Some(p.0 as *const _));
    s
}

unsafe fn attribute(token: &ISpObjectToken, name: &str) -> Option<String> {
    let key = token.OpenKey(&HSTRING::from("Attributes")).ok()?;
    let v = key.GetStringValue(&HSTRING::from(name)).ok()?;
    Some(take_pwstr(v))
}

// "403" or "403;409" (hex LCIDs) → "ca-ES"
unsafe fn lang_from_lcids(s: &str) -> String {
    let first = s.split(';').next().unwrap_or("").trim();
    let Ok(lcid) = u32::from_str_radix(first, 16) else { return String::new() };
    let mut buf = [0u16; 85];
    let n = LCIDToLocaleName(lcid, Some(&mut buf), 0);
    if n > 1 { String::from_utf16_lossy(&buf[..(n as usize - 1)]) } else { String::new() }
}

unsafe fn list_voices() -> Vec<VoiceDto> {
    let mut out = Vec::new();
    for (category, engine) in CATEGORIES {
        let Ok(cat) = CoCreateInstance::<_, ISpObjectTokenCategory>(&SpObjectTokenCategory, None, CLSCTX_ALL) else { continue };
        if cat.SetId(&HSTRING::from(category), false).is_err() {
            continue; // category not present on this machine
        }
        let Ok(tokens): Result<IEnumSpObjectTokens, _> = cat.EnumTokens(PCWSTR::null(), PCWSTR::null()) else { continue };
        let mut count = 0u32;
        if tokens.GetCount(&mut count).is_err() {
            continue;
        }
        for _ in 0..count {
            let mut token: Option<ISpObjectToken> = None;
            if tokens.Next(1, &mut token, None).is_err() {
                break;
            }
            let Some(token) = token else { break };
            let Ok(id) = token.GetId() else { continue };
            let id = take_pwstr(id);
            let name = attribute(&token, "Name")
                .or_else(|| token.GetStringValue(PCWSTR::null()).ok().map(|p| take_pwstr(p)))
                .unwrap_or_else(|| id.rsplit('\\').next().unwrap_or(&id).to_string());
            let lang = attribute(&token, "Language").map(|l| lang_from_lcids(&l)).unwrap_or_default();
            // Voices from online adapters say so in their name ("... Online").
            let offline = Some(!name.to_lowercase().contains("online"));
            out.push(VoiceDto { id, name, lang, engine: engine.to_string(), offline });
        }
    }
    out
}

/// Escapes text for SAPI XML and records, for each UTF-16 unit of the escaped string,
/// the index of the original UTF-16 unit it comes from.
fn escape_with_map(text: &str, prefix_len: usize) -> (String, Vec<usize>) {
    let mut out = String::new();
    let mut map = vec![0usize; prefix_len];
    let mut orig = 0usize;
    for ch in text.chars() {
        let rep: &str = match ch {
            '&' => "&amp;",
            '<' => "&lt;",
            '>' => "&gt;",
            _ => "",
        };
        let units = ch.len_utf16();
        if rep.is_empty() {
            out.push(ch);
            for _ in 0..units { map.push(orig); }
        } else {
            out.push_str(rep);
            for _ in 0..rep.len() { map.push(orig); }
        }
        orig += units;
    }
    map.push(orig);
    (out, map)
}

struct Current {
    id: u64,
    map: Vec<usize>,
    last_word: u32,
    started: Instant,
}

unsafe fn speak(voice: &ISpVoice, req: &SpeakRequest) -> windows::core::Result<Vec<usize>> {
    let token: ISpObjectToken = CoCreateInstance(&SpObjectToken, None, CLSCTX_ALL)?;
    token.SetId(PCWSTR::null(), &HSTRING::from(req.voice.as_str()), false)?;
    voice.SetVoice(&token)?;
    // SAPI rate is logarithmic: +10 ≈ 3× faster, -10 ≈ 3× slower.
    let rate = (10.0 * req.rate.max(0.1).ln() / 3f32.ln()).round().clamp(-10.0, 10.0) as i32;
    voice.SetRate(rate)?;
    voice.SetVolume((req.volume.clamp(0.0, 1.0) * 100.0).round() as u16)?;
    let pitch = ((req.pitch - 1.0) * 20.0).round().clamp(-10.0, 10.0) as i32;
    let prefix = format!("<pitch absmiddle=\"{pitch}\">");
    let prefix_units = prefix.encode_utf16().count();
    let (body, map) = escape_with_map(&req.text, prefix_units);
    let xml = format!("{prefix}{body}</pitch>");
    voice.Speak(&HSTRING::from(xml), (SPF_ASYNC.0 | SPF_PURGEBEFORESPEAK.0 | SPF_IS_XML.0) as u32, None)?;
    Ok(map)
}

pub fn run(rx: Receiver<Command>, emit: Emit) {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let voice: Option<ISpVoice> = CoCreateInstance(&SpVoice, None, CLSCTX_ALL).ok();
        let mut current: Option<Current> = None;

        loop {
            match rx.recv_timeout(Duration::from_millis(30)) {
                Ok(Command::Voices(reply)) => { let _ = reply.send(list_voices()); }
                Ok(Command::Speak(req)) => {
                    if let Some(c) = current.take() { emit(TtsEvent::end(c.id)); }
                    match voice.as_ref().map(|v| speak(v, &req)) {
                        Some(Ok(map)) => current = Some(Current { id: req.id, map, last_word: u32::MAX, started: Instant::now() }),
                        Some(Err(e)) => emit(TtsEvent::error(req.id, e.message().to_string())),
                        None => emit(TtsEvent::error(req.id, "SAPI no disponible".into())),
                    }
                }
                Ok(Command::Stop) => {
                    if let Some(v) = voice.as_ref() {
                        let _ = v.Speak(&HSTRING::new(), (SPF_ASYNC.0 | SPF_PURGEBEFORESPEAK.0) as u32, None);
                    }
                    if let Some(c) = current.take() { emit(TtsEvent::end(c.id)); }
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return,
            }

            if let (Some(c), Some(v)) = (current.as_mut(), voice.as_ref()) {
                let mut st = SPVOICESTATUS::default();
                if v.GetStatus(&mut st, std::ptr::null_mut()).is_ok() {
                    if st.ulInputWordLen > 0 && st.ulInputWordPos != c.last_word {
                        c.last_word = st.ulInputWordPos;
                        let pos = st.ulInputWordPos as usize;
                        if let (Some(&a), Some(&b)) = (c.map.get(pos), c.map.get(pos + st.ulInputWordLen as usize)) {
                            emit(TtsEvent::word(c.id, a, b.saturating_sub(a)));
                        }
                    }
                    let done = st.dwRunningState & (SPRS_DONE.0 as u32) != 0 && c.started.elapsed() > Duration::from_millis(60);
                    if done {
                        emit(TtsEvent::end(c.id));
                        current = None;
                    }
                }
            }
        }
    }
}
