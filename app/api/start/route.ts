import { type NextRequest, NextResponse } from "next/server"
import {
  extractAllCookies,
  extractViaJavaScript,
  identifyCriticalCookies,
  extractSessionTokens,
  buildCookieString,
  buildSetCookieString,
} from "@/lib/cookie-extractor"

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
  let browser: any = null

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

    browser = await chromium.launch({
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
            waitUntil: "domcontentloaded", // Faster than networkidle
            timeout: 30000,
          })

          try {
            await page.waitForLoadState("networkidle", { timeout: 10000 })
          } catch (e) {
            console.log("[v0] networkidle timed out, proceeding anyway")
          }

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
          `Failed to load login page after 3 attempts: ${lastError?.message || "Unknown error"}. This may be due to slow network, blocking, or the 30s timeout limit.`,
        )
      }

      try {
        await page.waitForLoadState("load", { timeout: 15000 })
      } catch (e) {
        console.log("[v0] Initial load state wait timed out, continuing")
      }
      await page.waitForTimeout(3000)

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
          usernameField = await page.waitForSelector(selector, { timeout: 2000, state: "visible" })
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
          passwordField = await page.waitForSelector(selector, { timeout: 2000, state: "visible" })
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
          submitButton = await page.waitForSelector(selector, { timeout: 2000, state: "visible" })
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
          page.waitForNavigation({ waitUntil: "load", timeout: 20000 }).catch(() => {
            console.log("[v0] post-click navigation timeout, checking current URL")
          }),
          submitButton.click({ timeout: 5000 }),
        ])
        console.log(`[v0] Clicked submit button`)
      } catch {
        // Fallback: try keyboard submit
        console.log(`[v0] Click failed, trying Enter key`)
        await passwordField.press("Enter")
        await page.waitForNavigation({ waitUntil: "load", timeout: 20000 }).catch(() => {})
      }

      await page.waitForTimeout(5000)

      // Check if login was successful by looking for common error indicators
      const errorIndicators = await page.$("text=/incorrect|invalid|wrong|error|failed/i")
      if (errorIndicators) {
        const errorText = await errorIndicators.textContent()
        console.log(`[v0] Login may have failed: ${errorText}`)
      }

      console.log(`[v0] Waiting for post-login dashboard or state...`)
      try {
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 })
      } catch (e) {
        console.log("[v0] post-login load state timeout")
      }
      await page.waitForTimeout(3000)

      if (targetUrl !== loginUrl) {
        console.log(`[v0] Navigating to target ${targetUrl} to ensure session propagation...`)
        try {
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 })
          await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})
        } catch (e) {
          console.log("[v0] Target URL navigation timeout, proceeding with extraction")
        }
      }

      console.log("[v0] ========== COOKIE EXTRACTION START ==========")

      // Method 1: Extract from browser context (MOST RELIABLE)
      console.log("[v0] Method 1: Extracting cookies from browser context...")
      const contextCookies = await extractAllCookies(context)
      console.log(`[v0] Method 1 (Context): Extracted ${contextCookies.length} cookies`)
      if (contextCookies.length > 0) {
        console.log(
          `[v0] Context cookies sample: ${contextCookies
            .slice(0, 3)
            .map((c) => c.name)
            .join(", ")}`,
        )
      }

      // Method 2: Extract via JavaScript
      console.log("[v0] Method 2: Extracting cookies via JavaScript...")
      const jsCookies = await extractViaJavaScript(page)
      console.log(`[v0] Method 2 (JavaScript): Extracted ${jsCookies.length} cookies`)
      if (jsCookies.length > 0) {
        console.log(
          `[v0] JS cookies sample: ${jsCookies
            .slice(0, 3)
            .map((c) => c.name)
            .join(", ")}`,
        )
      }

      const allCookies = contextCookies.length >= jsCookies.length ? contextCookies : jsCookies
      const extractionMethod = contextCookies.length >= jsCookies.length ? "context" : "javascript"

      console.log(`[v0] Using ${extractionMethod} method (${allCookies.length} cookies)`)

      if (allCookies.length === 0) {
        console.error("[v0] CRITICAL: No cookies extracted from any method!")
        throw new Error("No cookies extracted from any method. Login may have failed or cookies are blocked.")
      }

      const criticalCookieNames = identifyCriticalCookies(allCookies)
      console.log(`[v0] Identified ${criticalCookieNames.length} critical cookies: ${criticalCookieNames.join(", ")}`)

      const sessionTokens = extractSessionTokens(allCookies)
      console.log(`[v0] Found ${sessionTokens.length} session tokens (length > 100 chars)`)
      sessionTokens.forEach((token) => {
        console.log(`[v0]   - ${token.name}: ${token.length} characters`)
      })

      const cookieString = buildCookieString(allCookies)
      const setCookieStrings = buildSetCookieString(allCookies)

      console.log(`[v0] Total cookies extracted: ${allCookies.length}`)
      console.log(`[v0] Cookie string total length: ${cookieString.length} characters`)
      console.log("[v0] ========== COOKIE EXTRACTION COMPLETE ==========")

      const webhookPayload = {
        targetUrl,
        loginUrl,
        username,
        timestamp: new Date().toISOString(),
        extraction: {
          totalCookies: allCookies.length,
          criticalCookies: criticalCookieNames.length,
          sessionTokens: sessionTokens.length,
          cookieStringLength: cookieString.length,
          extractionMethod: extractionMethod,
        },
        criticalCookieNames: criticalCookieNames,
        sessionTokens: sessionTokens.map((t) => ({
          name: t.name,
          length: t.length,
          value: t.value, // FULL VALUE - NO TRUNCATION
        })),
        cookies: allCookies, // ALL cookies with FULL values
        cookieString: cookieString,
        setCookieHeaders: setCookieStrings,
        extractionMethods: {
          contextCookies: contextCookies.length,
          jsCookies: jsCookies.length,
          methodUsed: extractionMethod,
        },
        debugInfo: {
          pageUrl: page.url(),
          pageTitle: await page.title().catch(() => "Unknown"),
          extractedAt: new Date().toISOString(),
        },
      }

      let webhookSuccess = false
      let webhookError = null

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[v0] Sending to webhook (attempt ${attempt}/${3}): ${webhookUrl}`)
          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "LoginAutomation/1.0",
            },
            body: JSON.stringify(webhookPayload),
          })

          console.log(`[v0] Webhook response: ${webhookResponse.status} ${webhookResponse.statusText}`)

          if (webhookResponse.ok) {
            console.log("[v0] Webhook sent successfully!")
            webhookSuccess = true
            break
          } else {
            const errorText = await webhookResponse.text().catch(() => "")
            console.warn(`[v0] Webhook failed with status ${webhookResponse.status}: ${errorText}`)
            webhookError = `HTTP ${webhookResponse.status}: ${errorText.substring(0, 100)}`
          }
        } catch (webhookErr) {
          console.error(`[v0] Webhook error (attempt ${attempt}):`, webhookErr)
          webhookError = webhookErr instanceof Error ? webhookErr.message : String(webhookErr)

          if (attempt < 3) {
            console.log("[v0] Retrying webhook in 2 seconds...")
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      }

      await browser.close()
      browser = null

      return NextResponse.json({
        status: "success",
        message: `Successfully extracted ${allCookies.length} cookies (${criticalCookieNames.length} critical, ${sessionTokens.length} session tokens)${webhookSuccess ? " and sent to webhook" : ""}`,
        webhookSent: webhookSuccess,
        webhookError: webhookSuccess ? undefined : webhookError,
        extraction: {
          totalCookies: allCookies.length,
          criticalCookies: criticalCookieNames.length,
          sessionTokens: sessionTokens.length,
          cookieStringLength: cookieString.length,
          extractionMethod: extractionMethod,
        },
        criticalCookieNames: criticalCookieNames,
        sessionTokens: sessionTokens.map((t) => ({
          name: t.name,
          length: t.length,
          preview: t.value.substring(0, 50) + (t.value.length > 50 ? "..." : ""),
          fullLength: t.value.length,
        })),
        cookies: allCookies,
        cookieString: cookieString,
        extractionMethods: {
          context: contextCookies.length,
          javascript: jsCookies.length,
          used: extractionMethod,
        },
      })
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {})
        browser = null
      }
      throw error
    }
  } catch (error) {
    if (browser) {
      await browser.close().catch((err) => {
        console.error("[v0] Browser cleanup error:", err)
      })
    }

    console.error("Automation error:", error)
    const errorMessage = error instanceof Error ? error.message : "Automation failed"
    const errorDetails = error instanceof Error && error.cause ? ` Cause: ${String(error.cause)}` : ""
    return NextResponse.json(
      {
        status: "error",
        message: errorMessage + errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
