"""Abstract base class for vendor provisioners."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ProvisionResult:
    """Result of a successful key provisioning at a vendor."""

    api_key: str  # The real vendor key (shown once, never stored)
    vendor_key_id: str  # Vendor's ID for this key (for revocation)
    vendor_project_id: str  # Vendor's project/workspace ID
    project_name: str  # Human-readable project name
    instructions: dict  # Usage instructions for the developer


@dataclass
class ProvisionRequest:
    """Input parameters for key provisioning."""

    developer_name: str
    developer_email: str
    team: str
    budget_limit_usd: float = 50.0
    rate_limit_rpm: int = 60
    models_allowed: Optional[list[str]] = None
    description: str = ""


class BaseVendorProvisioner(ABC):
    """
    Abstract base class for vendor-specific key provisioning.

    Each vendor implements:
    - provision(): Create a scoped project/workspace and issue a key
    - revoke(): Delete a key at the vendor
    - health_check(): Verify admin credentials are valid
    """

    vendor_name: str = "base"

    @abstractmethod
    async def provision(self, request: ProvisionRequest) -> ProvisionResult:
        """
        Provision a new scoped API key at the vendor.

        Steps (vendor-specific):
        1. Create a project/workspace for isolation
        2. Create a service account or API key within it
        3. Set budget/rate limits if supported
        4. Return the real key + metadata

        Raises:
            VendorProvisioningError: If any vendor API call fails
        """
        ...

    @abstractmethod
    async def revoke(self, vendor_project_id: str, vendor_key_id: str) -> bool:
        """
        Revoke/delete a key at the vendor.

        Returns True if successfully revoked, False if key was already gone.

        Raises:
            VendorProvisioningError: If the revocation API call fails
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Verify that admin credentials are valid and the vendor API is reachable.

        Returns True if healthy.
        """
        ...
