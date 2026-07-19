"""HomeMe Stripe checkout stub — real integration not yet configured."""

class CheckoutSessionRequest:
    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class CheckoutSessionResponse:
    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class CheckoutStatusResponse:
    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class StripeCheckout:
    def __init__(self, *args, **kwargs):
        pass

    async def create_checkout_session(self, *args, **kwargs):
        raise RuntimeError("Stripe checkout is not yet configured on this deployment.")

    async def get_checkout_status(self, *args, **kwargs):
        raise RuntimeError("Stripe checkout is not yet configured on this deployment.")
