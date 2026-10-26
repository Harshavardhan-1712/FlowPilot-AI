import json
from typing import List, Dict, Any, Optional, Type
import httpx
from pydantic import BaseModel
from app.config import settings
from app.providers.base import BaseLLMProvider, LLMResponse
from app.providers.mock_provider import MockLLMProvider


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.fallback = MockLLMProvider()

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        if not self.api_key:
            return self.fallback.generate_text(prompt, system_prompt)

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.2
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                return LLMResponse(
                    content=content,
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                    total_tokens=usage.get("total_tokens", 0),
                    model="gpt-4o-mini"
                )
        except Exception:
            # Graceful fallback on network error or quota exhaustion
            return self.fallback.generate_text(prompt, system_prompt)

    def generate_structured(self, prompt: str, response_model: Type[BaseModel], system_prompt: Optional[str] = None) -> Any:
        return self.fallback.generate_structured(prompt, response_model, system_prompt)

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            return self.fallback.generate_embeddings(texts)

        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "text-embedding-3-small",
            "input": texts
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                return [item["embedding"][:384] for item in data["data"]]
        except Exception:
            return self.fallback.generate_embeddings(texts)
