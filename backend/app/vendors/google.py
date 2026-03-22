"""Google Vertex AI vendor provisioner.

Uses GCP IAM to create a Service Account per developer with Vertex AI User role.

Requires: google-cloud-iam, google-cloud-resource-manager
"""

import json
import secrets

from app.core.exceptions import VendorProvisioningError
from app.vendors.base import BaseVendorProvisioner, ProvisionRequest, ProvisionResult


class GoogleVertexProvisioner(BaseVendorProvisioner):
    vendor_name = "google_vertex"

    def __init__(self, project_id: str, region: str = "us-central1"):
        self.project_id = project_id
        self.region = region

    async def provision(self, request: ProvisionRequest) -> ProvisionResult:
        sa_id = (
            f"kg-{request.developer_name.lower().replace(' ', '-')[:20]}"
            f"-{secrets.token_hex(3)}"
        )
        sa_email = f"{sa_id}@{self.project_id}.iam.gserviceaccount.com"

        try:
            from google.cloud import iam_admin_v1
            from google.iam.v1 import iam_policy_pb2, policy_pb2
            from google.cloud import resourcemanager_v3

            # Create service account
            iam_client = iam_admin_v1.IAMClient()
            sa = iam_client.create_service_account(
                request={
                    "name": f"projects/{self.project_id}",
                    "account_id": sa_id,
                    "service_account": {
                        "display_name": f"KeyGate: {request.developer_name} ({request.team})",
                        "description": request.description or f"Managed by KeyGate for {request.developer_name}",
                    },
                }
            )

            # Create key for the service account
            key = iam_client.create_service_account_key(
                request={"name": f"projects/{self.project_id}/serviceAccounts/{sa_email}"}
            )

            # Grant Vertex AI User role
            rm_client = resourcemanager_v3.ProjectsClient()
            policy = rm_client.get_iam_policy(
                request={"resource": f"projects/{self.project_id}"}
            )

            binding = policy_pb2.Binding()
            binding.role = "roles/aiplatform.user"
            binding.members.append(f"serviceAccount:{sa_email}")
            policy.bindings.append(binding)

            rm_client.set_iam_policy(
                request={
                    "resource": f"projects/{self.project_id}",
                    "policy": policy,
                }
            )

            # The key is base64-encoded JSON credentials
            import base64
            credentials_json = base64.b64decode(key.private_key_data).decode("utf-8")

            return ProvisionResult(
                api_key=credentials_json,
                vendor_key_id=key.name.split("/")[-1],
                vendor_project_id=sa_email,
                project_name=sa_id,
                instructions={
                    "base_url": f"https://{self.region}-aiplatform.googleapis.com/v1",
                    "auth": "Service account JSON credentials",
                    "region": self.region,
                    "usage": (
                        "Save the JSON credentials to a file and set "
                        "GOOGLE_APPLICATION_CREDENTIALS environment variable. "
                        "This service account has Vertex AI User role only."
                    ),
                    "sdk_example": (
                        "import vertexai\n"
                        "from vertexai.generative_models import GenerativeModel\n\n"
                        f'vertexai.init(project="{self.project_id}", location="{self.region}")\n'
                        'model = GenerativeModel("gemini-pro")\n'
                        'response = model.generate_content("Hello")'
                    ),
                },
            )

        except ImportError:
            raise VendorProvisioningError(
                "google_vertex",
                "Google Cloud SDK not installed. Run: pip install google-cloud-iam google-cloud-resource-manager",
            )
        except Exception as e:
            raise VendorProvisioningError("google_vertex", str(e))

    async def revoke(self, vendor_project_id: str, vendor_key_id: str) -> bool:
        try:
            from google.cloud import iam_admin_v1

            client = iam_admin_v1.IAMClient()
            client.delete_service_account_key(
                request={
                    "name": f"projects/{self.project_id}/serviceAccounts/{vendor_project_id}/keys/{vendor_key_id}"
                }
            )
            return True

        except ImportError:
            raise VendorProvisioningError("google_vertex", "Google Cloud SDK not installed.")
        except Exception as e:
            if "NOT_FOUND" in str(e):
                return False
            raise VendorProvisioningError("google_vertex", f"Failed to revoke: {e}")

    async def health_check(self) -> bool:
        try:
            from google.cloud import iam_admin_v1

            client = iam_admin_v1.IAMClient()
            client.list_service_accounts(request={"name": f"projects/{self.project_id}"})
            return True
        except Exception:
            return False
