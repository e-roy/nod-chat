# Setting Up Vertex AI (Gemini) for Firebase

This guide will help you enable Google's Gemini AI model in your Firebase project to generate realistic, context-aware test data.

## Prerequisites

- Firebase project already created (`message-ai-b426b`)
- Firebase CLI installed and authenticated
- Project must be on **Blaze (pay-as-you-go) plan** for Vertex AI

## Step 1: Upgrade to Blaze Plan (if needed)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`message-ai-b426b`)
3. Click the gear icon → **Usage and billing**
4. Click **Modify plan**
5. Select **Blaze (pay-as-you-go)** plan
6. Add billing information

**Note:** Vertex AI has a generous free tier. For test data generation, costs will be minimal (< $1 typically).

## Step 2: Enable Vertex AI API

### Option A: Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`message-ai-b426b`)
3. In the left sidebar, scroll down and click **Build** → **Machine Learning**
4. Click **Get Started** on the Vertex AI card
5. Follow the prompts to enable the API

### Option B: Via Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`message-ai-b426b`)
3. In the navigation menu, go to **APIs & Services** → **Library**
4. Search for "Vertex AI API"
5. Click on "Vertex AI API"
6. Click **Enable**

Also enable:

- **Generative Language API** (for Gemini)
- **Cloud AI Platform API**

## Step 3: Set Up Service Account (for Local Development)

### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Name it: `vertex-ai-dev`
6. Click **Create and Continue**

### Grant Permissions

Add these roles:

- `Vertex AI User` (for using Gemini models)
- `Firebase Admin` (for emulator access)

### Download Credentials

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON**
5. Download the key file
6. Save it as `service-account-key.json` in the project root (it's gitignored)

## Step 4: Set Environment Variable

### Windows (PowerShell)

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\service-account-key.json"
```

### Mac/Linux (Bash)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

### Permanent Setup (Optional)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or PowerShell profile):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

## Step 5: Install Dependencies

```bash
cd packages/scripts
pnpm install
```

This will install `@google-cloud/vertexai` package.

## Step 6: Test AI Generation

### Run with AI enabled:

```bash
USE_AI=true pnpm seed
```

or from project root:

```bash
cd ../../
USE_AI=true pnpm seed
```

### Windows PowerShell:

```powershell
$env:USE_AI="true"
pnpm seed
```

You should see:

```
🤖 AI Mode enabled - using Gemini for message generation
✅ Vertex AI initialized for Gemini model
```

## Troubleshooting

### Error: "Permission denied"

**Solution:** Make sure you added the `Vertex AI User` role to your service account.

### Error: "Vertex AI API has not been used"

**Solution:** Enable Vertex AI API in Google Cloud Console (see Step 2).

### Error: "Quota exceeded"

**Solution:**

- Check your quotas in Google Cloud Console
- Vertex AI free tier: 60 requests per minute
- For data generation, this should be sufficient

### Falls back to templates

**Solution:** Check that:

1. `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set correctly
2. Service account key file exists at that path
3. Service account has `Vertex AI User` role
4. Vertex AI API is enabled

## Cost Estimation

**Gemini 1.5 Flash pricing (as of 2024):**

- Input: $0.075 per 1M tokens (characters/4)
- Output: $0.30 per 1M tokens

**For seed script (30 users, 18 chats, 6 groups):**

- ~24 API calls (groups + chats)
- ~500-1000 tokens per call
- **Estimated cost: < $0.10 per run**

**Free tier includes:**

- 15 requests per minute
- 1M tokens per month free

## Using in Production

For production use:

1. **Never commit** service account keys to git
2. Use **Workload Identity** or **Application Default Credentials** instead
3. Set up proper **IAM roles** for your deployment environment
4. Monitor **API usage** in Google Cloud Console

## Disable AI Generation

To use template-based generation (no cost, no setup):

```bash
pnpm seed
```

Just omit the `USE_AI=true` flag, and the script will use the built-in message templates.
