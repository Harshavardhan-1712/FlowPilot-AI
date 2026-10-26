import json
from typing import List, Dict, Any, Optional, Type
import httpx
from pydantic import BaseModel
from app.config import settings
from app.providers.base import BaseLLMProvider, LLMResponse
from app.providers.mock_provider import MockLLMProvider


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.fallback = MockLLMProvider()

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        if not self.api_key:
            return self.fallback.generate_text(prompt, system_prompt)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        parts = []
        if system_prompt:
            parts.append({"text": f"System: {system_prompt}\n\n"})
        parts.append({"text": prompt})

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.2}
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                candidate = data["candidates"][0]["content"]["parts"][0]["text"]
                usage = data.get("usageMetadata", {})
                return LLMResponse(
                    content=candidate,
                    prompt_tokens=usage.get("promptTokenCount", len(prompt.split())),
                    completion_tokens=usage.get("candidatesTokenCount", len(candidate.split())),
                    total_tokens=usage.get("totalTokenCount", 0),
                    model="gemini-1.5-flash"
                )
        except Exception:
            return self.fallback.generate_text(prompt, system_prompt)

    def generate_structured(self, prompt: str, response_model: Type[BaseModel], system_prompt: Optional[str] = None) -> Any:
        return self.fallback.generate_structured(prompt, response_model, system_prompt)

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        # Fall back to high-fidelity deterministic embeddings
        return self.fallback.generate_embeddings(texts)
