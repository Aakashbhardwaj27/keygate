"""Custom exceptions and error handlers."""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class VendorProvisioningError(Exception):
    """Raised when a vendor API call fails during key provisioning."""

    def __init__(self, vendor: str, message: str, status_code: int = 502):
        self.vendor = vendor
        self.message = message
        self.status_code = status_code
        super().__init__(f"[{vendor}] {message}")


class KeyNotFoundError(Exception):
    def __init__(self, key_id: str):
        self.key_id = key_id
        super().__init__(f"Key not found: {key_id}")


class DeveloperNotFoundError(Exception):
    def __init__(self, dev_id: str):
        self.dev_id = dev_id
        super().__init__(f"Developer not found: {dev_id}")


async def vendor_error_handler(request: Request, exc: VendorProvisioningError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "vendor_provisioning_error",
            "vendor": exc.vendor,
            "message": exc.message,
        },
    )


async def not_found_handler(request: Request, exc: KeyNotFoundError | DeveloperNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"error": "not_found", "message": str(exc)},
    )
