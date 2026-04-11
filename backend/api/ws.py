import json
import time
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import orjson
from core.config import settings, log
from core.session import sessions, touch_session
from services.llm_service import call_llm, SYSTEM_PROMPT, TECH_SYSTEM_PROMPT
from services.audio_service import text_to_speech_bytes
from utils.pdf_extractor import sanitize_text

router = APIRouter()

@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    if session_id not in sessions:
        await websocket.send_json({"type": "error", "message": "Session not found."})
        await websocket.close(code=4004)
        return

    session = sessions[session_id]
    touch_session(session_id)

    if session.get("interview_type") == "tech":
        system_msg_content = f"{TECH_SYSTEM_PROMPT}\n\n--- INTERVIEW PARAMETERS ---\nLanguages: {', '.join(session.get('languages', []))}\nComplexity: {session.get('complexity', 'medium')}"
    elif session.get("interview_type") == "job_roadmap":
        # Use the per-session custom prompt containing exact studied topics
        system_msg_content = session.get("custom_system_prompt") or (
            f"You are Aira, a technical interviewer.\n"
            f"Job: {session.get('job_title', '')} ({session.get('experience_level', '')})\n"
            f"Topics studied: {', '.join(session.get('topics_studied', []))}\n"
            f"ASK ONLY about the topics listed above."
        )
    else:
        system_msg_content = f"{SYSTEM_PROMPT}\n\n--- CANDIDATE RESUME ---\n{session.get('resume_text', '')}"

    system_msg = {
        "role": "system",
        "content": system_msg_content,
    }

    async def safe_send(data: dict):
        try:
            # Using orjson to serialize then send as text instead of standard JSON is faster,
            # but websocket.send_text doesn't natively use orjson so we encode manually
            await websocket.send_text(orjson.dumps(data).decode('utf-8'))
        except Exception:
            pass

    async def interviewer_respond(user_text: str | None = None):
        try:
            touch_session(session_id)

            messages = [system_msg] + session["history"]
            if user_text:
                messages.append({"role": "user", "content": user_text})

            t0 = time.time()
            ai_text = await call_llm(messages)
            llm_ms = int((time.time() - t0) * 1000)

            if user_text:
                session["history"].append({"role": "user", "content": user_text})
            session["history"].append({"role": "assistant", "content": ai_text})
            session["question_count"] += 1

            max_history = 40
            if len(session["history"]) > max_history:
                session["history"] = session["history"][-max_history:]

            await safe_send({
                "type": "transcript",
                "speaker": "interviewer",
                "text": ai_text,
            })

            log.info("LLM responded in %dms (%d chars)", llm_ms, len(ai_text))

            t1 = time.time()
            audio_bytes = await text_to_speech_bytes(ai_text)
            tts_ms = int((time.time() - t1) * 1000)

            if audio_bytes:
                audio_b64 = base64.b64encode(audio_bytes).decode()
                await safe_send({"type": "audio", "data": audio_b64, "format": "mp3"})
                log.info("TTS generated in %dms (%d KB)", tts_ms, len(audio_bytes) // 1024)

            await safe_send({"type": "interviewer_done"})

        except HTTPException as e:
            await safe_send({"type": "error", "message": e.detail})
            await safe_send({"type": "interviewer_done"})
        except Exception as e:
            log.error("interviewer_respond error: %s", e)
            await safe_send({"type": "error", "message": "Something went wrong processing your response."})
            await safe_send({"type": "interviewer_done"})

    # Greet the candidate
    await interviewer_respond()

    try:
        while True:
            # use receive_text and orjson to decode for speed
            raw = await websocket.receive_text()
            try:
                data = orjson.loads(raw)
            except orjson.JSONDecodeError:
                await safe_send({"type": "error", "message": "Invalid message format."})
                continue

            msg_type = data.get("type", "")

            if msg_type == "candidate_message":
                user_text = sanitize_text(data.get("text", ""))
                if not user_text:
                    continue
                await safe_send({
                    "type": "transcript",
                    "speaker": "candidate",
                    "text": user_text,
                })
                await interviewer_respond(user_text)

            elif msg_type == "end_interview":
                feedback_prompt = (
                    "Based on this interview conversation, provide a brief, warm closing "
                    "message (2-3 sentences) telling the candidate what went well and next steps. "
                    "Sound like a real human interviewer wrapping up a call."
                )
                messages = [system_msg] + session["history"] + [
                    {"role": "user", "content": feedback_prompt}
                ]
                try:
                    closing = await call_llm(messages)
                    await safe_send({"type": "transcript", "speaker": "interviewer", "text": closing})
                    audio = await text_to_speech_bytes(closing)
                    if audio:
                        await safe_send({
                            "type": "audio",
                            "data": base64.b64encode(audio).decode(),
                            "format": "mp3",
                        })
                except Exception as e:
                    log.error("End interview error: %s", e)

                await safe_send({"type": "interview_ended"})
                break

            elif msg_type == "ping":
                await safe_send({"type": "pong"})

    except WebSocketDisconnect:
        log.info("Client disconnected: %s", session_id[:8])
    except Exception as e:
        log.error("WS error for %s: %s", session_id[:8], e)
    finally:
        touch_session(session_id)
