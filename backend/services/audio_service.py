import os
import asyncio
import tempfile
import re
from fastapi import HTTPException
from core.config import settings, log
from services.http_client import get_http_client

async def text_to_speech_bytes(text: str) -> bytes:
    """Convert text → MP3 audio bytes. Returns empty bytes on failure."""
    client = await get_http_client()

    # ── ElevenLabs ──
    if settings.TTS_BACKEND == "elevenlabs" and settings.ELEVENLABS_API_KEY:
        try:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE}",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {"stability": 0.45, "similarity_boost": 0.85},
                },
            )
            if resp.status_code == 200:
                return resp.content
            log.warning("ElevenLabs TTS %d", resp.status_code)
        except Exception as e:
            log.warning("ElevenLabs TTS error: %s", e)

    # ── OpenAI TTS ──
    if settings.OPENAI_API_KEY:
        try:
            resp = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": settings.OPENAI_TTS_MODEL,
                    "voice": settings.OPENAI_TTS_VOICE,
                    "input": text,
                    "response_format": "mp3",
                },
            )
            if resp.status_code == 200:
                return resp.content
            log.warning("OpenAI TTS %d", resp.status_code)
        except Exception as e:
            log.warning("OpenAI TTS error: %s", e)

    # ── gTTS fallback (run in thread to avoid blocking event loop) ──
    try:
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(None, _gtts_sync, text)
        if data:
            return data
    except Exception as e:
        log.warning("gTTS error: %s", e)

    return b""

def _gtts_sync(text: str) -> bytes:
    """Blocking gTTS call — run inside run_in_executor."""
    from gtts import gTTS
    tmp_path = tempfile.mktemp(suffix=".mp3")
    try:
        tts = gTTS(text=text, lang="en", slow=False)
        tts.save(tmp_path)
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

async def transcribe_audio_bytes(audio_bytes: bytes, content_type: str = "") -> str:
    """Transcribe audio bytes using Whisper (Groq or OpenAI)."""
    if len(audio_bytes) < 1000:
        return ""  # Too short to contain speech

    client = await get_http_client()
    suffix = ".webm" if "webm" in content_type else ".wav"
    filename = f"upload{suffix}"

    form_data = {
        "model": "whisper-large-v3",
        "language": "en",
        "prompt": "This is a candidate's answer in an interview. Only transcribe English speech. Do not transcribe background noise."
    }

    text = ""
    if settings.GROQ_API_KEY:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data=form_data,
        )
        if resp.status_code != 200:
            log.warning("Groq STT %d: %s", resp.status_code, resp.text[:200])
        else:
            text = resp.json().get("text", "").strip()

    elif settings.OPENAI_API_KEY:
        form_data["model"] = "whisper-1"
        resp = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data=form_data,
        )
        if resp.status_code != 200:
            log.warning("OpenAI STT %d: %s", resp.status_code, resp.text[:200])
        else:
            text = resp.json().get("text", "").strip()
    else:
        raise HTTPException(status_code=500, detail="No STT API key configured.")

    # Filter out common Whisper hallucinations during silence/noise
    # 1. Background noise enclosed in brackets/asterisks (e.g. *soft murmurs*, [silence])
    filtered_text = re.sub(r'\*[^\*]+\*', '', text)
    filtered_text = re.sub(r'\[[^\]]+\]', '', filtered_text)
    filtered_text = re.sub(r'\([^\)]+\)', '', filtered_text)
    
    # If the remaining text has no alphanumeric characters, it was purely noise.
    meaningful = re.sub(r'[^a-zA-Z0-9]', '', filtered_text).strip()
    if not meaningful:
        return ""
        
    lower_text = text.lower().replace(".", "").replace("!", "").replace("?", "").strip()
    hallucinations = [
        "thank you", "thanks", "thanks for watching", "thank you for watching", 
        "please subscribe", "subscribe", "bye", "bye bye", "amén", "amen"
    ]
    if lower_text in hallucinations:
        return ""

    return text
