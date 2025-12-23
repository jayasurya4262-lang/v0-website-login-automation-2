# Website Login Automation

A Node.js/Next.js service that automates website logins, captures session cookies, and forwards them to an n8n webhook for downstream automation.

## Features

- **Universal Login Automation** - Works with most login forms (including LeetCode)
- **Cookie Capture** - Extracts all session cookies after authentication
- **Webhook Integration** - Sends cookies to your n8n workflow
- **Web UI** - Simple dashboard to configure and run automations

## n8n Integration (Scheduled Login)

### Step 1: Create n8n Webhook

1. In n8n, add a **Webhook** node
2. Set HTTP Method to `POST`
3. Copy the **Production URL** (looks like `https://your-n8n.app.n8n.cloud/webhook/abc123`)
4. Add nodes after webhook to use the cookies (e.g., HTTP Request node)

### Step 2: Create Schedule Trigger

1. Add a **Schedule Trigger** node set to 7:00 AM daily
2. Add an **HTTP Request** node after it:
   - Method: `POST`
   - URL: `https://your-render-app.onrender.com/api/start`
   - Body (JSON):
   \`\`\`json
   {
     "targetUrl": "https://leetcode.com",
     "loginUrl": "https://leetcode.com/accounts/login",
     "username": "your_username",
     "password": "your_password",
     "webhookUrl": "https://your-n8n.app.n8n.cloud/webhook/abc123"
   }
   \`\`\`

### Step 3: Use Cookies in n8n

In the webhook receiver workflow, access cookies:
- All cookies: `{{ $json.cookies }}`
- Cookie string (for HTTP headers): `{{ $json.cookieString }}`
- Individual cookie: `{{ $json.cookies.find(c => c.name === 'LEETCODE_SESSION').value }}`

### Complete n8n Workflow Example

\`\`\`
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Schedule Trigger│ ──▶ │ HTTP Request     │ ──▶ │ (Wait for       │
│ (7:00 AM daily) │     │ POST /api/start  │     │  webhook)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Webhook         │ ──▶ │ Set (extract     │ ──▶ │ HTTP Request    │
│ (receives       │     │  cookieString)   │     │ (use cookies)   │
│  cookies)       │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
\`\`\`

## API Usage

### POST /api/start

\`\`\`json
{
  "targetUrl": "https://leetcode.com",
  "loginUrl": "https://leetcode.com/accounts/login",
  "username": "your_username",
  "password": "your_password",
  "webhookUrl": "https://your-n8n.app.n8n.cloud/webhook/abc123"
}
\`\`\`

### Response

\`\`\`json
{
  "status": "success",
  "message": "Captured 10 cookies and sent to webhook",
  "webhookSent": true,
  "importantCookies": ["LEETCODE_SESSION", "csrftoken"],
  "cookies": [
    {
      "name": "LEETCODE_SESSION",
      "value": "abc123...",
      "domain": ".leetcode.com"
    }
  ]
}
\`\`\`

### Webhook Payload (sent to n8n)

\`\`\`json
{
  "targetUrl": "https://leetcode.com",
  "loginUrl": "https://leetcode.com/accounts/login",
  "username": "your_username",
  "timestamp": "2024-01-15T07:00:00.000Z",
  "cookieCount": 10,
  "importantCookies": ["LEETCODE_SESSION", "csrftoken"],
  "cookies": [...],
  "cookieString": "LEETCODE_SESSION=abc123; csrftoken=xyz789; ..."
}
\`\`\`

## Deployment to Render

### Step 1: Push to GitHub

\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/login-automation.git
git push -u origin main
\`\`\`

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Render will auto-detect the Docker configuration
5. Click **Create Web Service**

The deployment will take 5-10 minutes as it builds the Docker image and installs Playwright browsers.

## Supported Websites

Tested and working with:
- LeetCode
- GitHub
- Many standard login forms

## Troubleshooting

### "Could not find username/email input field"
- The website may use a custom login form
- Check render logs for the list of detected input fields
- The form may require JavaScript to load - wait time increased to 5 seconds

### Webhook errors
- Make sure you're using your actual n8n webhook URL
- URL should contain `/webhook/` (production) or `/webhook-test/` (testing)
- Check n8n workflow is active

### Login fails
- Some sites have CAPTCHA or Cloudflare protection
- Check if credentials are correct
- Site may be blocking automated access

## Security Notes

- Never hardcode credentials in code
- Use n8n credentials store for passwords
- Cookies expire - schedule re-login as needed
- Never log or expose full cookie values
