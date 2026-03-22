"""Vendor provisioner registry."""

from app.vendors.base import BaseVendorProvisioner, ProvisionRequest, ProvisionResult
from app.vendors.openai import OpenAIProvisioner
from app.vendors.anthropic import AnthropicProvisioner
from app.vendors.azure import AzureOpenAIProvisioner
from app.vendors.google import GoogleVertexProvisioner

__all__ = [
    "BaseVendorProvisioner",
    "ProvisionRequest",
    "ProvisionResult",
    "OpenAIProvisioner",
    "AnthropicProvisioner",
    "AzureOpenAIProvisioner",
    "GoogleVertexProvisioner",
    "VENDOR_REGISTRY",
]

# Maps vendor type string -> provisioner class
VENDOR_REGISTRY: dict[str, type[BaseVendorProvisioner]] = {
    "openai": OpenAIProvisioner,
    "anthropic": AnthropicProvisioner,
    "azure_openai": AzureOpenAIProvisioner,
    "google_vertex": GoogleVertexProvisioner,
}
