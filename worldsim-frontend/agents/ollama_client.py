"""
WORLDSIM: India Ecosystem — Ollama API Client
Wrapper for local LLM inference via Ollama REST API.
"""

import json
import requests
from config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, OLLAMA_MAX_RETRIES


class OllamaClient:
    """Client for interacting with a local Ollama instance."""

    def __init__(self, base_url=None, model=None, timeout=None):
        self.base_url = (base_url or OLLAMA_BASE_URL).rstrip("/")
        self.model = model or OLLAMA_MODEL
        self.timeout = timeout or OLLAMA_TIMEOUT

    # ─── Health ───────────────────────────────────────────────────────────

    def is_healthy(self) -> bool:
        """Check if Ollama server is running."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return r.status_code == 200
        except requests.ConnectionError:
            return False

    def list_models(self) -> list:
        """List available models."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            data = r.json()
            return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    def model_available(self) -> bool:
        """Check if the configured model is available."""
        models = self.list_models()
        return any(self.model in m for m in models)

    # ─── Generate (Single-shot) ───────────────────────────────────────────

    def generate(self, prompt: str, system: str = "", format_json: bool = True) -> dict:
        """
        Generate a single response from the LLM.

        Args:
            prompt: The user prompt.
            system: System prompt for context/persona.
            format_json: If True, request JSON output format.

        Returns:
            Dict with 'response' (str), 'parsed' (dict if JSON), 'success' (bool).
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 1024,
            },
        }

        if system:
            payload["system"] = system

        if format_json:
            payload["format"] = "json"

        for attempt in range(OLLAMA_MAX_RETRIES + 1):
            try:
                r = requests.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=self.timeout,
                )
                r.raise_for_status()
                data = r.json()
                response_text = data.get("response", "")

                result = {
                    "response": response_text,
                    "parsed": None,
                    "success": True,
                    "model": data.get("model", self.model),
                    "eval_count": data.get("eval_count", 0),
                    "total_duration_ms": data.get("total_duration", 0) / 1_000_000,
                }

                # Try to parse JSON
                if format_json and response_text.strip():
                    try:
                        result["parsed"] = json.loads(response_text)
                    except json.JSONDecodeError:
                        # Try to extract JSON from response
                        result["parsed"] = self._extract_json(response_text)

                return result

            except requests.Timeout:
                if attempt < OLLAMA_MAX_RETRIES:
                    continue
                return {"response": "", "parsed": None, "success": False,
                        "error": "Timeout after retries"}
            except requests.RequestException as e:
                if attempt < OLLAMA_MAX_RETRIES:
                    continue
                return {"response": "", "parsed": None, "success": False,
                        "error": str(e)}

    # ─── Chat (Multi-turn) ────────────────────────────────────────────────

    def chat(self, messages: list, format_json: bool = False) -> dict:
        """
        Multi-turn chat with the LLM.

        Args:
            messages: List of dicts with 'role' and 'content' keys.
                      Roles: 'system', 'user', 'assistant'
            format_json: If True, request JSON output format.

        Returns:
            Dict with 'response' (str), 'parsed' (dict if JSON), 'success' (bool).
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 1024,
            },
        }

        if format_json:
            payload["format"] = "json"

        for attempt in range(OLLAMA_MAX_RETRIES + 1):
            try:
                r = requests.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    timeout=self.timeout,
                )
                r.raise_for_status()
                data = r.json()
                msg = data.get("message", {})
                response_text = msg.get("content", "")

                result = {
                    "response": response_text,
                    "parsed": None,
                    "success": True,
                    "role": msg.get("role", "assistant"),
                }

                if format_json and response_text.strip():
                    try:
                        result["parsed"] = json.loads(response_text)
                    except json.JSONDecodeError:
                        result["parsed"] = self._extract_json(response_text)

                return result

            except requests.Timeout:
                if attempt < OLLAMA_MAX_RETRIES:
                    continue
                return {"response": "", "parsed": None, "success": False,
                        "error": "Timeout"}
            except requests.RequestException as e:
                if attempt < OLLAMA_MAX_RETRIES:
                    continue
                return {"response": "", "parsed": None, "success": False,
                        "error": str(e)}

    # ─── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _extract_json(text: str) -> dict | None:
        """Try to extract JSON from a text that may contain extra content."""
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        return None


# ─── Module-level singleton ──────────────────────────────────────────────────

_client = None


def get_ollama_client() -> OllamaClient:
    """Get the shared OllamaClient instance."""
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client
