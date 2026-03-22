# Vendor Setup Guides

Detailed instructions for configuring each LLM vendor in KeyGate.

## OpenAI

### Prerequisites

- An OpenAI organization with the **Admin** or **Owner** role
- Access to the [Organization Admin API](https://platform.openai.com/docs/api-reference/organization)

### Getting Your Admin Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **Settings → Organization → API Keys**
3. Create a new API key with **Admin** permissions
4. Note your **Organization ID** from the settings page (starts with `org-`)

### What KeyGate Does

For each developer, KeyGate:

1. **Creates a Project** via `POST /v1/organization/projects`
   - Named: `keygate-{team}-{developer}-{random}`
2. **Creates a Service Account** in that project via `POST /v1/organization/projects/{id}/service_accounts`
   - This generates a project-scoped API key
3. **Returns the real API key** to the admin (shown once)

The developer uses this key with `https://api.openai.com/v1` — standard SDK, no changes needed.

### Revocation

KeyGate calls `DELETE /v1/organization/projects/{id}/api_keys/{key_id}` to immediately invalidate the key.

### Permissions Required

| Permission | Why |
|---|---|
| Organization Admin | Create and manage projects |
| Service Account management | Create keys within projects |

---

## Anthropic

### Prerequisites

- An Anthropic organization with **Admin** access
- Access to the [Admin API](https://docs.anthropic.com/en/api/admin-api)

### Getting Your Admin Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **Settings → Organization → Admin API Keys**
3. Create an admin-level API key

### What KeyGate Does

For each developer, KeyGate:

1. **Creates a Workspace** via `POST /v1/organizations/workspaces`
2. **Creates an API Key** scoped to that workspace via `POST /v1/organizations/api_keys`
3. **Returns the real API key** to the admin

The developer uses this key with `https://api.anthropic.com/v1` — standard SDK.

### Revocation

KeyGate calls `POST /v1/organizations/api_keys/{id}/disable` to disable the key.

### Permissions Required

| Permission | Why |
|---|---|
| Organization Admin | Create workspaces and API keys |
| Workspace management | Scope keys to workspaces |

---

## Azure OpenAI

### Prerequisites

- An Azure subscription with **Contributor** role on a resource group
- Azure CLI configured or a service principal

### Setup

Azure OpenAI works differently from the others: instead of API keys, KeyGate creates a **separate Azure Cognitive Services resource** per developer. Each resource has its own endpoint and keys.

### Configuration

In KeyGate, provide:

| Field | Value |
|---|---|
| Subscription ID | Your Azure subscription ID |
| Resource Group | The resource group where resources will be created |
| Tenant ID | Your Azure AD tenant ID (optional if using DefaultAzureCredential) |

### What KeyGate Does

For each developer, KeyGate:

1. **Creates a Cognitive Services resource** via Azure Resource Manager
   - SKU: S0 (Standard)
   - Kind: OpenAI
   - Location: eastus (configurable)
2. **Retrieves the resource keys** (`Key1`)
3. **Returns the key and endpoint** to the admin

The developer uses their unique endpoint (e.g., `https://keygate-ml-priya-a3f2c1.openai.azure.com/`) with the Azure OpenAI SDK.

### Important Notes

- Each Azure OpenAI resource can have **model deployments** configured. The admin may need to deploy models to each new resource.
- Azure OpenAI has **regional quotas**. Creating many resources in one region may hit limits.
- Consider using a **dedicated resource group** for KeyGate-managed resources.

### Authentication

KeyGate uses `DefaultAzureCredential` from the Azure SDK, which supports:
- Environment variables (service principal)
- Managed Identity (when running in Azure)
- Azure CLI credentials (development)

### Required Azure Roles

| Role | Scope | Why |
|---|---|---|
| Contributor | Resource Group | Create Cognitive Services resources |
| Cognitive Services Contributor | Resource Group | Manage keys and deployments |

### Install Azure SDK

```bash
pip install azure-identity azure-mgmt-cognitiveservices
```

---

## Google Vertex AI

### Prerequisites

- A GCP project with Vertex AI API enabled
- IAM Admin permissions on the project

### Setup

Google Vertex AI uses **Service Accounts** for authentication. KeyGate creates a service account per developer with the `roles/aiplatform.user` role.

### Configuration

In KeyGate, provide:

| Field | Value |
|---|---|
| GCP Project ID | Your Google Cloud project ID |
| Region | e.g., `us-central1` |

### What KeyGate Does

For each developer, KeyGate:

1. **Creates a Service Account** via GCP IAM API
2. **Generates a JSON key** for the service account
3. **Grants `roles/aiplatform.user`** role on the project
4. **Returns the JSON credentials** to the admin

The developer saves the JSON file and sets `GOOGLE_APPLICATION_CREDENTIALS`, or passes it directly to the SDK.

### Important Notes

- Each GCP project has a **limit of 100 service accounts** by default. Request a quota increase if needed.
- Service account keys should be rotated periodically.
- Consider using **Workload Identity** instead of JSON keys in GKE environments.

### Required GCP Roles

| Role | Why |
|---|---|
| `iam.serviceAccountAdmin` | Create service accounts |
| `iam.serviceAccountKeyAdmin` | Generate keys |
| `resourcemanager.projectIamAdmin` | Grant Vertex AI roles |

### Install Google SDK

```bash
pip install google-cloud-iam google-cloud-resource-manager
```

---

## Adding a Custom Vendor

KeyGate's vendor system is extensible. To add a new vendor:

1. Create `backend/app/vendors/your_vendor.py`
2. Implement the `BaseVendorProvisioner` abstract class
3. Register in `backend/app/vendors/__init__.py`
4. Add the enum value to `VendorType`
5. Update the frontend `VENDORS` constant

See the [Contributing Guide](../CONTRIBUTING.md) for detailed instructions.
