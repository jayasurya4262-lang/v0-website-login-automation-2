import { type NextRequest, NextResponse } from "next/server"

interface LoginRequest {
  targetUrl: string
  loginUrl: string
  username: string
  password: string
  webhookUrl: string
}

interface CookieData {
  name: string
  value: string
  domain: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { targetUrl, loginUrl, username, password, webhookUrl } = body

    // Validate required fields
    if (!targetUrl || !loginUrl || !username || !password || !webhookUrl) {
      return NextResponse.json({ status: "error", message: "Missing required fields" }, { status: 400 })
    }

    if (!webhookUrl.includes("/webhook/") && !webhookUrl.includes("/webhook-test/")) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid webhook URL. Use your n8n webhook URL like: https://your-n8n.app.n8n.cloud/webhook/xxxxx",
        },
        { status: 400 },
      )
    }

    let chromium
    try {
      const playwright = await import("playwright")
      chromium = playwright.chromium
    } catch (err) {
      console.error("Playwright import error:", err)
      return NextResponse.json(
        {
          status: "error",
          message: "Playwright is not available. Ensure the app is deployed with Docker on Render.",
        },
        { status: 500 },
      )
    }

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-blink-features=AutomationControlled",
        "--ignore-certificate-errors",
        "--allow-running-insecure-content",
        "--disable-extensions",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--safebrowsing-disable-auto-update",
      ],
    })

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/New_York",
      ignoreHTTPSErrors: true,
    })

    const page = await context.newPage()

    try {
      let navigationSuccess = false
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[v0] Attempt ${attempt}: Navigating to ${loginUrl}`)
          await page.goto(loginUrl, {
            waitUntil: "networkidle",
            timeout: 60000,
          })
          navigationSuccess = true
          console.log(`[v0] Successfully loaded ${loginUrl}`)
          break
        } catch (navError) {
          lastError = navError instanceof Error ? navError : new Error(String(navError))
          console.error(`[v0] Navigation attempt ${attempt} failed:`, lastError.message)
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      }

      if (!navigationSuccess) {
        throw new Error(
          `Failed to load login page after 3 attempts: ${lastError?.message || "Unknown error"}. This may be due to the target website blocking automated access or network restrictions.`,
        )
      }

      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(5000)

      const usernameSelectors = [
        // LeetCode specific
        'input[data-cy="sign-in-email-input"]',
        'input[name="login"]',
        "#id_login",
        // Generic selectors
        'input[name="username"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[id="username"]',
        'input[id="email"]',
        'input[id="login-email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]',
        'input[placeholder*="E-mail" i]',
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
        // Fallback: first visible text input
        'form input[type="text"]:visible',
        "form input:not([type]):visible",
      ]

      const passwordSelectors = [
        // LeetCode specific
        'input[data-cy="sign-in-password-input"]',
        "#id_password",
        // Generic selectors
        'input[name="password"]',
        'input[type="password"]',
        'input[id="password"]',
        'input[autocomplete="current-password"]',
      ]

      const submitSelectors = [
        // LeetCode specific
        'button[data-cy="sign-in-btn"]',
        "#signin_btn",
        // Generic selectors
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Log in")',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'button:has-text("Sign In")',
        'button:has-text("Submit")',
        'button:has-text("Continue")',
        '[role="button"]:has-text("Log in")',
        '[role="button"]:has-text("Sign in")',
        '[role="button"]:has-text("Sign In")',
      ]

      // Find and fill username field
      let usernameField = null
      for (const selector of usernameSelectors) {
        try {
          usernameField = await page.waitForSelector(selector, { timeout: 3000, state: "visible" })
          if (usernameField) {
            console.log(`[v0] Found username field with selector: ${selector}`)
            break
          }
        } catch {
          continue
        }
      }

      if (!usernameField) {
        console.log(`[v0] Page title: ${await page.title()}`)
        console.log(`[v0] Current URL: ${page.url()}`)
        const inputs = await page.$$eval("input", (els) =>
          els.map((el) => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            dataCy: el.getAttribute("data-cy"),
          })),
        )
        console.log(`[v0] Found inputs:`, JSON.stringify(inputs))
        throw new Error(
          "Could not find username/email input field. The page may have a different structure or be blocking automation.",
        )
      }

      await usernameField.click()
      await page.waitForTimeout(300)
      await usernameField.fill("")
      await usernameField.type(username, { delay: 80 })
      console.log(`[v0] Filled username field`)

      // Find and fill password field
      let passwordField = null
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.waitForSelector(selector, { timeout: 3000, state: "visible" })
          if (passwordField) {
            console.log(`[v0] Found password field with selector: ${selector}`)
            break
          }
        } catch {
          continue
        }
      }

      if (!passwordField) {
        throw new Error("Could not find password input field")
      }

      await passwordField.click()
      await page.waitForTimeout(300)
      await passwordField.fill("")
      await passwordField.type(password, { delay: 80 })
      console.log(`[v0] Filled password field`)

      await page.waitForTimeout(1000)

      // Find submit button
      let submitButton = null
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.waitForSelector(selector, { timeout: 3000, state: "visible" })
          if (submitButton) {
            console.log(`[v0] Found submit button with selector: ${selector}`)
            break
          }
        } catch {
          continue
        }
      }

      if (!submitButton) {
        throw new Error("Could not find submit button")
      }

      try {
        await page.waitForFunction(
          (btn) => {
            const element = btn as HTMLButtonElement
            return !element.disabled && element.getAttribute("aria-disabled") !== "true"
          },
          submitButton,
          { timeout: 10000 },
        )
        console.log(`[v0] Submit button is enabled`)
      } catch {
        console.log(`[v0] Button may be disabled, trying to click anyway`)
      }

      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {}),
          submitButton.click({ timeout: 5000 }),
        ])
        console.log(`[v0] Clicked submit button`)
      } catch {
        // Fallback: try keyboard submit
        console.log(`[v0] Click failed, trying Enter key`)
        await passwordField.press("Enter")
        await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {})
      }

      await page.waitForTimeout(5000)

      // Check if login was successful by looking for common error indicators
      const errorIndicators = await page.$("text=/incorrect|invalid|wrong|error|failed/i")
      if (errorIndicators) {
        const errorText = await errorIndicators.textContent()
        console.log(`[v0] Login may have failed: ${errorText}`)
      }

      // Extract cookies
      const cookies = await context.cookies()
      console.log(`[v0] Captured ${cookies.length} cookies`)

      const importantCookies = cookies.filter(
        (c) =>
          c.name.toLowerCase().includes("session") ||
          c.name.toLowerCase().includes("token") ||
          c.name.toLowerCase().includes("auth") ||
          c.name.toLowerCase().includes("csrf") ||
          c.name.toLowerCase().includes("user") ||
          c.name === "LEETCODE_SESSION" ||
          c.name === "csrftoken",
      )

      const cookieData: CookieData[] = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
      }))

      const webhookPayload = {
        targetUrl,
        loginUrl,
        username,
        timestamp: new Date().toISOString(),
        cookieCount: cookieData.length,
        importantCookies: importantCookies.map((c) => c.name),
        cookies: cookieData,
        cookieString: cookieData.map((c) => `${c.name}=${c.value}`).join("; "),
      }

      let webhookSuccess = false
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[v0] Sending ${cookieData.length} cookies to webhook (attempt ${attempt}): ${webhookUrl}`)
          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "LoginAutomation/1.0",
            },
            body: JSON.stringify(webhookPayload),
          })

          if (!webhookResponse.ok) {
            console.warn(`[v0] Webhook responded with status: ${webhookResponse.status}`)
          } else {
            console.log(`[v0] Webhook success: ${webhookResponse.status}`)
            webhookSuccess = true
            break
          }
        } catch (webhookError) {
          console.error(`[v0] Webhook error (attempt ${attempt}):`, webhookError)
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      }

      await browser.close()

      return NextResponse.json({
        status: "success",
        message: `Captured ${cookieData.length} cookies${webhookSuccess ? " and sent to webhook" : " (webhook failed)"}`,
        webhookSent: webhookSuccess,
        importantCookies: importantCookies.map((c) => c.name),
        cookies: cookieData.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          expires: c.expires,
          httpOnly: c.httpOnly,
          secure: c.secure,
        })),
        cookieString: cookieData.map((c) => `${c.name}=${c.value}`).join("; "),
      })
    } catch (error) {
      await browser.close()
      throw error
    }
  } catch (error) {
    console.error("Automation error:", error)
    const errorMessage = error instanceof Error ? error.message : "Automation failed"
    const errorDetails = error instanceof Error && error.cause ? ` Cause: ${String(error.cause)}` : ""
    return NextResponse.json(
      {
        status: "error",
        message: errorMessage + errorDetails,
      },
      { status: 500 },
    )
  }
}
