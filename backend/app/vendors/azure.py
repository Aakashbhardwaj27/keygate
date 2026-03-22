"""Azure OpenAI vendor provisioner.

Uses Azure Resource Manager to create Cognitive Services resources per developer.
Each resource gets its own API key and endpoint.

Requires: azure-identity, azure-mgmt-cognitiveservices
"""

import secrets
from app.core.exceptions import VendorProvisioningError
from app.vendors.base import BaseVendorProvisioner, ProvisionRequest, ProvisionResult


class AzureOpenAIProvisioner(BaseVendorProvisioner):
    vendor_name = "azure_openai"

    def __init__(
        self,
        subscription_id: str,
        resource_group: str,
        tenant_id: str | None = None,
    ):
        self.subscription_id = subscription_id
        self.resource_group = resource_group
        self.tenant_id = tenant_id

    async def provision(self, request: ProvisionRequest) -> ProvisionResult:
        """
        Creates an Azure Cognitive Services (OpenAI) resource.

        Production implementation using Azure SDK:

            from azure.identity.aio import DefaultAzureCredential
            from azure.mgmt.cognitiveservices.aio import CognitiveServicesManagementClient

            credential = DefaultAzureCredential()
            client = CognitiveServicesManagementClient(credential, self.subscription_id)

            resource_name = f"keygate-{request.team}-{request.developer_name}-{token}"

            account = await client.accounts.begin_create(
                self.resource_group,
                resource_name,
                {
                    "sku": {"name": "S0"},
                    "kind": "OpenAI",
                    "location": "eastus",
                    "properties": {},
                },
            )
            result = await account.result()

            keys = await client.accounts.list_keys(self.resource_group, resource_name)
            api_key = keys.key1
            endpoint = result.properties.endpoint
        """
        resource_name = (
            f"keygate-{request.team}-{request.developer_name.lower().replace(' ', '-')}"
            f"-{secrets.token_hex(3)}"
        )

        try:
            from azure.identity.aio import DefaultAzureCredential
            from azure.mgmt.cognitiveservices.aio import CognitiveServicesManagementClient

            credential = DefaultAzureCredential()
            client = CognitiveServicesManagementClient(credential, self.subscription_id)

            poller = await client.accounts.begin_create(
                self.resource_group,
                resource_name,
                {
                    "sku": {"name": "S0"},
                    "kind": "OpenAI",
                    "location": "eastus",
                    "properties": {},
                },
            )
            account = await poller.result()
            keys = await client.accounts.list_keys(self.resource_group, resource_name)

            await credential.close()
            await client.close()

            return ProvisionResult(
                api_key=keys.key1,
                vendor_key_id=resource_name,
                vendor_project_id=resource_name,
                project_name=resource_name,
                instructions={
                    "base_url": f"https://{resource_name}.openai.azure.com/",
                    "auth_header": "api-key: <your-key>",
                    "api_version": "2024-06-01",
                    "usage": (
                        "Use this endpoint and key with the Azure OpenAI SDK. "
                        "Deploy models to your resource before making API calls."
                    ),
                    "sdk_example": (
                        'from openai import AzureOpenAI\n'
                        'client = AzureOpenAI(\n'
                        f'    azure_endpoint="https://{resource_name}.openai.azure.com/",\n'
                        '    api_key="<your-key>",\n'
                        '    api_version="2024-06-01"\n'
                        ')'
                    ),
                },
            )

        except ImportError:
            raise VendorProvisioningError(
                "azure_openai",
                "Azure SDK not installed. Run: pip install azure-identity azure-mgmt-cognitiveservices",
            )
        except Exception as e:
            raise VendorProvisioningError("azure_openai", str(e))

    async def revoke(self, vendor_project_id: str, vendor_key_id: str) -> bool:
        try:
            from azure.identity.aio import DefaultAzureCredential
            from azure.mgmt.cognitiveservices.aio import CognitiveServicesManagementClient

            credential = DefaultAzureCredential()
            client = CognitiveServicesManagementClient(credential, self.subscription_id)

            # Regenerate keys (effectively revokes old ones)
            await client.accounts.regenerate_key(
                self.resource_group,
                vendor_key_id,
                {"key_name": "Key1"},
            )

            await credential.close()
            await client.close()
            return True

        except ImportError:
            raise VendorProvisioningError("azure_openai", "Azure SDK not installed.")
        except Exception as e:
            raise VendorProvisioningError("azure_openai", f"Failed to revoke: {e}")

    async def health_check(self) -> bool:
        try:
            from azure.identity.aio import DefaultAzureCredential
            from azure.mgmt.cognitiveservices.aio import CognitiveServicesManagementClient

            credential = DefaultAzureCredential()
            client = CognitiveServicesManagementClient(credential, self.subscription_id)
            # List accounts to verify access
            accounts = client.accounts.list_by_resource_group(self.resource_group)
            async for _ in accounts:
                break
            await credential.close()
            await client.close()
            return True
        except Exception:
            return False
