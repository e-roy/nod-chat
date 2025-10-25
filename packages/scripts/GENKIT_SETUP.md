# Setting Up Google AI (Gemini) with Firebase Genkit

This guide will help you enable Google's Gemini AI model using **Firebase Genkit** - a much simpler approach than Vertex AI!

## Why Genkit?

✅ **Much easier setup** - No complex service accounts or IAM roles  
✅ **Free tier included** - Generous free quota for testing  
✅ **Firebase-native** - Built specifically for Firebase apps  
✅ **Simple API key** - Just one environment variable

## Prerequisites

- Firebase project already created (`message-ai-b426b`)
- Firebase project on **Blaze (pay-as-you-go) plan**

## Step 1: Upgrade to Blaze Plan (if not already done)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`message-ai-b426b`)
3. Click the gear icon → **Usage and billing**
4. Click **Modify plan**
5. Select **Blaze (pay-as-you-go)** plan
6. Add billing information

**Note:** Google AI has a generous free tier. Test data generation costs are minimal.

## Step 2: Get Your Google AI API Key

### Option A: Through Google AI Studio (Recommended - Easiest!)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account (same one as Firebase)
3. Click **"Create API Key"**
4. Select your Firebase project (`message-ai-b426b`) OR create a new project
5. Click **"Create API key in existing project"** or **"Create API key"**
6. **Copy the API key** - you'll need it in the next step!

### Option B: Through Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`message-ai-b426b`)
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"API key"**
5. Copy the API key
6. (Optional) Click **"Restrict key"** and limit to "Generative Language API"

## Step 3: Configure Environment Variables

### Option A: Using .env File (Recommended - Easiest!)

1. Navigate to `packages/scripts` directory
2. Copy the example file:

   ```bash
   cp .env.example .env
   ```

   Or on Windows:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` file:

   ```bash
   GOOGLE_API_KEY=your_actual_api_key_here
   USE_AI=true
   ```

4. Save the file - the script will automatically load it!

### Option B: Set Environment Variables Manually

**Windows (PowerShell):**

```powershell
$env:GOOGLE_API_KEY="your_api_key_here"
$env:USE_AI="true"
```

**Mac/Linux (Bash/Zsh):**

```bash
export GOOGLE_API_KEY="your_api_key_here"
export USE_AI=true
```

### Permanent Setup (Optional)

**Windows PowerShell Profile:**

1. Open PowerShell
2. Run: `notepad $PROFILE`
3. Add: `$env:GOOGLE_API_KEY="your_api_key_here"`
4. Save and restart PowerShell

**Mac/Linux (add to `~/.bashrc` or `~/.zshrc`):**

```bash
export GOOGLE_API_KEY="your_api_key_here"
```

## Step 4: Install Dependencies

```bash
cd packages/scripts
pnpm install
```

This installs `genkit` and `@genkit-ai/googleai` packages.

## Step 5: Test AI Generation

### From project root:

```bash
GOOGLE_API_KEY=your_key_here USE_AI=true pnpm seed
```

### Windows PowerShell:

```powershell
$env:GOOGLE_API_KEY="your_key_here"
$env:USE_AI="true"
pnpm seed
```

### Mac/Linux:

```bash
export GOOGLE_API_KEY="your_key_here"
USE_AI=true pnpm seed
```

You should see:

```
🤖 AI Mode enabled - using Gemini for message generation
✅ Firebase Genkit initialized with Google AI
```

## Troubleshooting

### Error: "GOOGLE_API_KEY not set"

**Solution:** Make sure you've exported the environment variable in your current terminal session.

### Error: "Failed to initialize Genkit"

**Solution:**

- Check that your API key is correct
- Verify you're on the Blaze plan
- Make sure you created the API key in the correct project

### Falls back to templates

**Solution:** Check that:

1. `GOOGLE_API_KEY` environment variable is set
2. `USE_AI=true` flag is passed to the seed command
3. API key is valid and not expired

### Error: "Quota exceeded"

**Solution:**

- Google AI free tier: 15 requests per minute, 1500 requests per day
- For test data generation (24 AI calls), this should be plenty
- If exceeded, wait a minute and try again

## Cost Estimation

**Gemini 1.5 Flash (via Google AI):**

- **Free tier:** 15 RPM, 1M tokens/day, 1500 RPD (requests per day)
- **Paid tier:** $0.075 per 1M input tokens, $0.30 per 1M output tokens

**For seed script (30 users, 18 chats, 6 groups):**

- ~24 AI calls total
- ~500-1000 tokens per call
- **Estimated cost:** FREE (within free tier) or < $0.05 if exceeded

**Free tier is MORE than enough for development!**

## Security Best Practices

1. **Never commit API keys** to git (.gitignore is already configured)
2. **Use environment variables** only
3. **Restrict API key** in Google Cloud Console:
   - Limit to "Generative Language API"
   - Optional: Add application restrictions
4. **Rotate keys** periodically for production use

## Comparison: Genkit vs Vertex AI

| Feature              | Genkit (Google AI)       | Vertex AI                         |
| -------------------- | ------------------------ | --------------------------------- |
| Setup                | ✅ Simple (API key only) | ❌ Complex (service account, IAM) |
| Free Tier            | ✅ 1500 requests/day     | ⚠️ Limited                        |
| Cost                 | 💰 Very low              | 💰 Low                            |
| Firebase Integration | ✅ Native                | ⚠️ Requires setup                 |
| Best For             | Development, Testing     | Production at scale               |

**Recommendation:** Use Genkit for this use case! It's perfect for development and test data generation.

## Disable AI Generation

To use template-based generation (no cost, no setup):

```bash
pnpm seed
```

Just omit the `USE_AI=true` and `GOOGLE_API_KEY` - the script will use built-in professional message templates.
