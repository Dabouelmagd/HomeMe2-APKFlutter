"""HomeMe AI assistant stub — real integration not yet configured."""

class UserMessage:
    def __init__(self, *args, **kwargs):
        self.text = kwargs.get("text", args[0] if args else "")

class LlmChat:
    def __init__(self, *args, **kwargs):
        pass

    def with_model(self, *args, **kwargs):
        return self

    async def send_message(self, *args, **kwargs):
        raise RuntimeError("AI assistant is not yet configured on this deployment.")
