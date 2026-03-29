from pydantic_settings import BaseSettings, SettingsConfigDict
import logging

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_TTS_MODEL: str = "tts-1"
    OPENAI_TTS_VOICE: str = "nova"
    ELEVENLABS_VOICE: str = "21m00Tcm4TlvDq8ikWAM"

    SESSION_TTL: int = 1800
    MAX_RESUME_CHARS: int = 4000
    MAX_MESSAGE_LEN: int = 2000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def LLM_BACKEND(self) -> str:
        return "groq" if self.GROQ_API_KEY else "openai"

    @property
    def TTS_BACKEND(self) -> str:
        if self.ELEVENLABS_API_KEY:
            return "elevenlabs"
        if self.OPENAI_API_KEY:
            return "openai"
        return "gtts"

settings = Settings()

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s │ %(levelname)-7s │ %(message)s",
        datefmt="%H:%M:%S",
    )
    return logging.getLogger("hireiq")

log = setup_logging()
