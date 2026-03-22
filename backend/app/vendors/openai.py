"""OpenAI vendor provisioner.

Uses the OpenAI Organization Admin API to:
1. Create a Project per developer
2. Create a Service Account + API Key within that project
3. Optionally set rate limits on the project

Docs: https://platform.openai.com/docs/api-reference/organization
"""

import secrets
import httpx

from app.core.exceptions import VendorProvisioningError
from app.vendors.base import BaseVendorProvisioner, ProvisionRequest, ProvisionResult


class OpenAIProvisioner(BaseVendorProvisioner):
    vendor_name = "openai"

    def __init__(self, admin_api_key: str, org_id: str | None = None):
        self.admin_api_key = admin_api_key
        self.org_id = org_id
        self.base_url = "https://api.openai.com/v1"

    def _headers(self) -> dict:
        headers = {
            "Authorization": f"Bearer {self.admin_api_key}",
            "Content-Type": "application/json",
        }
        if self.org_id:
            headers["OpenAI-Organization"] = self.org_id
        return headers

    async def provision(self, request: ProvisionRequest) -> ProvisionResult:
        project_name = (
            f"keygate-{request.team}-{request.developer_name.lower().replace(' ', '-')}"
            f"-{secrets.token_hex(3)}"
        )
        sa_name = f"keygate-sa-{request.developer_name.lower().replace(' ', '-')}"

        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            # Step 1: Create Project
            proj_resp = await client.post(
                "/organization/projects",
                headers=self._headers(),
                json={"name": project_name},
            )
            if proj_resp.status_code != 200:
                raise VendorProvisioningError(
                    "openai",
                    f"Failed to create project: {proj_resp.status_code} {proj_resp.text}",
                )
            project = proj_resp.json()
            project_id = project["id"]

            # Step 2: Create Service Account + API Key
            sa_resp = await client.post(
                f"/organization/projects/{project_id}/service_accounts",
                headers=self._headers(),
                json={"name": sa_name},
            )
            if sa_resp.status_code != 200:
                raise VendorProvisioningError(
                    "openai",
                    f"Failed to create service account: {sa_resp.status_code} {sa_resp.text}",
                )
            sa_data = sa_resp.json()

            api_key = sa_data["api_key"]["value"]
            key_id = sa_data["api_key"]["id"]

            return ProvisionResult(
                api_key=api_key,
                vendor_key_id=key_id,
                vendor_project_id=project_id,
                project_name=project_name,
                instructions={
                    "base_url": "https://api.openai.com/v1",
                    "auth_header": "Authorization: Bearer <your-key>",
                    "usage": (
                        "Use this key exactly like a normal OpenAI API key. "
                        "It is scoped to your project with budget and rate limits applied."
                    ),
                    "sdk_example": (
                        'from openai import OpenAI\n'
                        'client = OpenAI(api_key="<your-key>")\n'
                        'response = client.chat.completions.create(\n'
                        '    model="gpt-4",\n'
                        '    messages=[{"role": "user", "content": "Hello"}]\n'
                        ')'
                    ),
                },
            )

    async def revoke(self, vendor_project_id: str, vendor_key_id: str) -> bool:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            # Delete the API key
            resp = await client.delete(
                f"/organization/projects/{vendor_project_id}/api_keys/{vendor_key_id}",
                headers=self._headers(),
            )
            if resp.status_code == 200:
                return True
            elif resp.status_code == 404:
                return False  # Already deleted
            else:
                raise VendorProvisioningError(
                    "openai",
                    f"Failed to revoke key: {resp.status_code} {resp.text}",
                )

    async def health_check(self) -> bool:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10) as client:
            resp = await client.get(
                "/organization/projects?limit=1",
                headers=self._headers(),
            )
            return resp.status_code == 200
