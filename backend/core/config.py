from pydantic_settings import BaseSettings, SettingsConfigDict
import logging

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    
    GROQ_MODEL_INTERVIEW: str = "openai/gpt-oss-120b"
    GROQ_MODEL_ANALYSIS: str = "qwen/qwen3.8-27b"
    GROQ_MODEL_RESUME: str = "qwen/qwen3.8-27b"
    GROQ_MODEL_FEEDBACK: str = "openai/gpt-oss-120b"
    GROQ_FALLBACK_MODELS: str = "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
    GROQ_STT_MODEL: str = "whisper-large-v3"
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_TTS_MODEL: str = "tts-1"
    OPENAI_TTS_VOICE: str = "nova"
    ELEVENLABS_VOICE: str = "21m00Tcm4TlvDq8ikWAM"

    SESSION_TTL: int = 1800
    MAX_RESUME_CHARS: int = 4000
    MAX_MESSAGE_LEN: int = 2000

    # Coding lab execution. On Vercel the local runner is unavailable, so
    # `auto` falls back to Judge0. Set CODE_EXECUTION_PROVIDER=local for offline dev.
    CODE_EXECUTION_PROVIDER: str = "auto"
    JUDGE0_URL: str = "https://ce.judge0.com"
    JUDGE0_API_KEY: str = ""
    JUDGE0_RAPIDAPI_HOST: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def LLM_BACKEND(self) -> str:
        return "groq" if self.GROQ_API_KEY else "openai"

    @property
    def GROQ_MODELS(self) -> list[str]:
        """Global fallback list, de-duplicated. Prefer models_for_task()."""
        candidates = [*self.GROQ_FALLBACK_MODELS.split(",")]
        models: list[str] = []
        for candidate in candidates:
            model = candidate.strip()
            if model and model not in models:
                models.append(model)
        return models

    def models_for_task(self, task: str) -> list[str]:
        """Primary model for a task, followed by global fallbacks."""
        primary = {
            "interview": self.GROQ_MODEL_INTERVIEW,
            "analysis": self.GROQ_MODEL_ANALYSIS,
            "resume": self.GROQ_MODEL_RESUME,
            "feedback": self.GROQ_MODEL_FEEDBACK,
        }.get(task, self.GROQ_MODEL_ANALYSIS)

        models: list[str] = []
        for candidate in [primary, *self.GROQ_MODELS]:
            model = candidate.strip()
            if model and model not in models:
                models.append(model)
        return models

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
