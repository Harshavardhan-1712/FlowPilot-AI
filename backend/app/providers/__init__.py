from app.config import settings
from app.providers.base import BaseLLMProvider, LLMResponse
from app.providers.mock_provider import MockLLMProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.gemini_provider import GeminiProvider


def get_llm_provider(provider_name: str = None) -> BaseLLMProvider:
    name = (provider_name or settings.LLM_PROVIDER).lower()
    if name == "openai":
        return OpenAIProvider()
    elif name == "gemini":
        return GeminiProvider()
    else:
        return MockLLMProvider()


__all__ = ["BaseLLMProvider", "LLMResponse", "MockLLMProvider", "OpenAIProvider", "GeminiProvider", "get_llm_provider"]
