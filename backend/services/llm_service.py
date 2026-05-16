"""
llm_service.py — Ollama / Llama 3 LLM Integration Service
==========================================================
Handles all AI language model interactions for the Memory Twin platform.

Uses Ollama's REST API with retries, startup validation, and health probes.
Fallback responses are returned only when Ollama is unreachable or inference
fails after all retry attempts.
"""

import logging
import time
from typing import Any, Optional, List

import requests
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import HTTPError, JSONDecodeError, ReadTimeout, Timeout

from config import settings

logger = logging.getLogger(__name__)

_HEALTH_OPTIONS = {"num_predict": 16, "num_ctx": 512, "temperature": 0.1}
_CHAT_OPTIONS = {
    "num_predict": settings.ollama_num_predict,
    "num_ctx": settings.ollama_num_ctx,
    "temperature": 0.7,
}


def _ollama_url(path: str) -> str:
    base = settings.ollama_host.rstrip("/")
    return f"{base}{path}"


def _model_names_from_tags(payload: dict) -> List[str]:
    return [m.get("name", "") for m in payload.get("models", [])]


def _model_installed(model_names: List[str]) -> bool:
    target = settings.ollama_model
    return any(
        name == target
        or name.startswith(f"{target}:")
        or name.split(":")[0] == target
        for name in model_names
    )


def _parse_chat_response(response: requests.Response) -> str:
    try:
        data = response.json()
    except JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON from Ollama: {exc}") from exc

    message = data.get("message")
    if not isinstance(message, dict):
        raise ValueError(f"Ollama response missing 'message' object: {data!r:.200}")

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError(f"Ollama response missing assistant content: {data!r:.200}")

    return content.strip()


def _chat_payload(
    messages: List[dict],
    *,
    options: Optional[dict] = None,
) -> dict[str, Any]:
    return {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": options or _CHAT_OPTIONS,
    }


def _post_chat(
    messages: List[dict],
    *,
    timeout: Optional[int] = None,
    options: Optional[dict] = None,
) -> str:
    response = requests.post(
        _ollama_url("/api/chat"),
        json=_chat_payload(messages, options=options),
        timeout=(settings.ollama_connect_timeout, timeout or settings.ollama_request_timeout),
    )
    response.raise_for_status()
    return _parse_chat_response(response)


def _log_ollama_error(kind: str, exc: Exception, attempt: int, max_retries: int) -> None:
    logger.error(
        "Ollama %s (attempt %s/%s, host=%s, model=%s): %s",
        kind,
        attempt + 1,
        max_retries,
        settings.ollama_host,
        settings.ollama_model,
        exc,
    )


def _retry_delay(attempt: int) -> float:
    return settings.ollama_retry_base_delay * (2 ** attempt)


def is_ollama_reachable() -> bool:
    try:
        response = requests.get(
            _ollama_url("/"),
            timeout=(settings.ollama_connect_timeout, settings.ollama_connect_timeout),
        )
        return response.status_code == 200
    except Exception as exc:
        logger.debug("Ollama reachability check failed: %s", exc)
        return False


def pull_model_if_missing() -> bool:
    """Ensure the configured model is present; pull automatically when missing."""
    try:
        tags = requests.get(
            _ollama_url("/api/tags"),
            timeout=(settings.ollama_connect_timeout, settings.ollama_connect_timeout),
        )
        tags.raise_for_status()
        model_names = _model_names_from_tags(tags.json())

        if _model_installed(model_names):
            logger.info("Llama3 loaded (%s available)", settings.ollama_model)
            return True

        logger.warning(
            "Model '%s' not found (installed: %s). Pulling...",
            settings.ollama_model,
            ", ".join(model_names) or "none",
        )
        pull = requests.post(
            _ollama_url("/api/pull"),
            json={"name": settings.ollama_model, "stream": False},
            timeout=(settings.ollama_connect_timeout, settings.ollama_pull_timeout),
        )
        pull.raise_for_status()
        logger.info("Llama3 loaded successfully after pull")
        return True
    except RequestsConnectionError as exc:
        logger.error("Ollama connection refused while checking model: %s", exc)
    except ReadTimeout as exc:
        logger.error("Ollama model pull timed out: %s", exc)
    except HTTPError as exc:
        body = exc.response.text if exc.response is not None else str(exc)
        logger.error("Ollama model pull HTTP error: %s", body)
    except JSONDecodeError as exc:
        logger.error("Ollama model list JSON parsing error: %s", exc)
    except Exception as exc:
        logger.error("Unexpected error checking/pulling Ollama model: %s", exc)
    return False


def validate_ai_startup() -> bool:
    """
    Startup validation: connectivity, model availability, and a real inference test.
    Returns True when AI inference is ready.
    """
    if not is_ollama_reachable():
        logger.error(
            "AI startup validation failed: cannot reach Ollama at %s",
            settings.ollama_host,
        )
        return False

    logger.info("Ollama connected")

    if not pull_model_if_missing():
        logger.error("AI startup validation failed: model '%s' unavailable", settings.ollama_model)
        return False

    logger.info("Llama3 loaded")

    max_retries = settings.ollama_max_retries
    for attempt in range(max_retries):
        try:
            logger.info("Testing AI inference with prompt 'hello'...")
            content = _post_chat(
                [{"role": "user", "content": "hello"}],
                timeout=settings.ollama_health_timeout,
                options=_HEALTH_OPTIONS,
            )
            if content:
                logger.info("AI inference ready")
                return True
            raise ValueError("Inference test returned empty content")
        except (RequestsConnectionError, Timeout) as exc:
            _log_ollama_error("connection/timeout during startup test", exc, attempt, max_retries)
        except HTTPError as exc:
            body = exc.response.text if exc.response is not None else str(exc)
            logger.error("Ollama HTTP error during startup test: %s", body)
        except ValueError as exc:
            _log_ollama_error("invalid response during startup test", exc, attempt, max_retries)
        except Exception as exc:
            _log_ollama_error("unexpected startup test error", exc, attempt, max_retries)

        if attempt < max_retries - 1:
            delay = _retry_delay(attempt)
            logger.info("Retrying startup inference in %.1fs...", delay)
            time.sleep(delay)

    logger.error("AI startup validation failed after %s attempts", max_retries)
    return False


def check_ai_health() -> dict:
    """Check Ollama connectivity, model installation, and a lightweight inference probe."""
    try:
        tags_response = requests.get(
            _ollama_url("/api/tags"),
            timeout=(settings.ollama_connect_timeout, settings.ollama_connect_timeout),
        )
        tags_response.raise_for_status()
        model_names = _model_names_from_tags(tags_response.json())

        if not _model_installed(model_names):
            return {
                "ollama": "connected",
                "model": "missing",
                "inference": "failing",
            }

        _post_chat(
            [{"role": "user", "content": "hello"}],
            timeout=settings.ollama_health_timeout,
            options=_HEALTH_OPTIONS,
        )

        return {
            "ollama": "connected",
            "model": settings.ollama_model,
            "inference": "working",
        }
    except RequestsConnectionError:
        return {"ollama": "unreachable", "model": "unknown", "inference": "failing"}
    except ReadTimeout:
        return {
            "ollama": "connected",
            "model": settings.ollama_model,
            "inference": "failing",
            "reason": "inference_timeout",
        }
    except HTTPError as exc:
        body = exc.response.text if exc.response is not None else str(exc)
        logger.error("AI health check HTTP error: %s", body)
        return {
            "ollama": "connected",
            "model": settings.ollama_model,
            "inference": "failing",
            "reason": "http_error",
        }
    except (JSONDecodeError, ValueError) as exc:
        logger.error("AI health check response parse error: %s", exc)
        return {
            "ollama": "connected",
            "model": settings.ollama_model,
            "inference": "failing",
            "reason": "invalid_response",
        }
    except Exception as exc:
        logger.error("AI health check failed: %s", exc)
        return {"ollama": "unreachable", "model": "unknown", "inference": "failing"}


def chat_with_llm(
    user_message: str,
    system_prompt: str = "",
    history: Optional[List[dict]] = None,
) -> str:
    """Send messages to Ollama and return the assistant response."""
    messages: List[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    max_retries = settings.ollama_max_retries

    for attempt in range(max_retries):
        try:
            return _post_chat(messages)

        except (RequestsConnectionError, Timeout) as exc:
            _log_ollama_error("connection/timeout", exc, attempt, max_retries)
            if attempt < max_retries - 1:
                delay = _retry_delay(attempt)
                logger.info("Retrying Ollama chat in %.1fs...", delay)
                time.sleep(delay)
                continue

        except HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            body = exc.response.text if exc.response is not None else str(exc)
            logger.error("Ollama HTTP %s: %s", status, body)

            if status == 404:
                logger.warning("Model missing during chat; attempting pull")
                if pull_model_if_missing() and attempt < max_retries - 1:
                    time.sleep(_retry_delay(attempt))
                    continue
                break

            if attempt < max_retries - 1:
                time.sleep(_retry_delay(attempt))
                continue

        except (JSONDecodeError, ValueError) as exc:
            _log_ollama_error("invalid response", exc, attempt, max_retries)
            if attempt < max_retries - 1:
                time.sleep(_retry_delay(attempt))
                continue

        except Exception as exc:
            _log_ollama_error("unexpected error", exc, attempt, max_retries)
            if attempt < max_retries - 1:
                time.sleep(_retry_delay(attempt))
                continue

    logger.error(
        "Ollama inference failed after %s attempts; returning fallback",
        max_retries,
    )
    return _fallback_response(user_message)


def tutor_response(question: str, subject_context: str = "") -> str:
    system = (
        "You are an expert AI tutor for university students. "
        "Explain concepts clearly with examples, analogies, and structured formatting. "
        "Use Markdown: bold for key terms, code blocks for code, bullet lists for steps. "
        "Be encouraging and pedagogically effective. "
        f"{'Current subject context: ' + subject_context if subject_context else ''}"
    )
    return chat_with_llm(question, system_prompt=system)


def generate_quiz(subject: str, difficulty: str = "medium", n_questions: int = 5) -> str:
    prompt = (
        f"Generate exactly {n_questions} multiple choice quiz questions about '{subject}' "
        f"at {difficulty} difficulty level for a university student. "
        "Format EACH question as:\n"
        "**Q[N]: [Question text]**\n"
        "A) [option]\nB) [option]\nC) [option]\nD) [option]\n"
        "✅ Answer: [letter]) [brief explanation]\n\n"
        "Start immediately without preamble."
    )
    return chat_with_llm(
        prompt,
        system_prompt="You are an expert academic quiz generator. Be precise, educational, and formatted correctly.",
    )


def summarize_text(text: str) -> str:
    if len(text) > 4000:
        text = text[:4000] + "..."

    prompt = (
        "Summarize the following academic content in a clear, structured format. "
        "Use: **Key Points**, bullet lists, and highlight important terms in bold.\n\n"
        f"Content:\n{text}"
    )
    return chat_with_llm(
        prompt,
        system_prompt="You are an academic assistant. Create concise, structured summaries for student review.",
    )


def generate_motivation(student_data: dict) -> str:
    gpa = student_data.get("gpa", 3.0)
    stress = student_data.get("stress_level", 40)
    weak = student_data.get("weak_subjects", [])

    prompt = (
        f"I'm a university student: GPA {gpa:.2f}/4.0, stress {stress:.0f}/100, "
        f"struggling in: {', '.join(weak) if weak else 'nothing specific'}. "
        "Give me ONE short motivational paragraph (2-3 sentences) followed by exactly "
        "3 specific, actionable study improvement tips as a numbered list."
    )
    return chat_with_llm(
        prompt,
        system_prompt=(
            "You are a supportive, evidence-based academic coach. "
            "Be warm, practical, and realistic. Never dismiss real struggles."
        ),
    )


def _fallback_response(message: str) -> str:
    return (
        "I'm your **AI Memory Twin** — the local AI engine is temporarily unavailable.\n\n"
        "While Ollama reconnects, here are evidence-based study strategies:\n\n"
        "1. **Active Recall** — Test yourself instead of re-reading.\n"
        "2. **Spaced Repetition** — Review at increasing intervals.\n"
        "3. **Feynman Technique** — Explain the concept in simple terms.\n\n"
        f"*Your question was: \"{message}\"*\n\n"
        "Please try again in a moment once the AI engine is back online."
    )
