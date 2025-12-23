// Universal Cookie Extraction - Works with ALL Websites

import type { Page, BrowserContext } from "playwright"

interface CookieResult {
  name: string
  value: string
  domain: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: string
}

interface ExtractionResult {
  status: "success" | "error"
  message?: string
  cookies?: CookieResult[]
  cookieString?: string
  importantCookies?: string[]
  cookieCount?: number
  sessionTokens?: { name: string; value: string; length: number }[]
  webhookSent?: boolean
  extractedAt?: string
}

const CRITICAL_PATTERNS = [
  /session/i,
  /sid/i,
  /sessionid/i,
  /jsessionid/i,
  /phpsessid/i,
  /asp\.net_sessionid/i,
  /auth/i,
  /token/i,
  /jwt/i,
  /access_token/i,
  /refresh_token/i,
  /user_token/i,
  /csrf/i,
  /xsrf/i,
  /crumb/i,
  /_token/i,
  /connect\.sid/i,
  /laravel_session/i,
  /SERVERID/i,
  /AWSALB/i,
  /cf_clearance/i,
  /__Secure/i,
  /__Host/i,
  /LEETCODE_SESSION/i,
  /INGRESSCOOKIE/i,
]

/**
 * Extract ALL cookies from page context
 * @param context - Browser context
 * @returns Complete cookie array
 */
export async function extractAllCookies(context: BrowserContext): Promise<CookieResult[]> {
  try {
    const cookies = await context.cookies()
    return cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value, // FULL VALUE - NO TRUNCATION
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }))
  } catch (error) {
    console.error("Cookie extraction error:", error)
    return []
  }
}

/**
 * Extract cookies from page headers (alternative method)
 * @param page - Playwright page
 * @returns Cookie string from Set-Cookie headers
 */
export async function extractFromHeaders(page: Page): Promise<string[]> {
  try {
    const cookies: string[] = []

    // Intercept all network responses
    page.on("response", (response) => {
      const setCookieHeaders = response.headers()["set-cookie"]
      if (setCookieHeaders) {
        const headerArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
        cookies.push(...headerArray)
      }
    })

    return cookies
  } catch (error) {
    console.error("Header extraction error:", error)
    return []
  }
}

/**
 * Extract cookies via document.cookie (JavaScript execution)
 * @param page - Playwright page
 * @returns Cookies extracted via JS
 */
export async function extractViaJavaScript(page: Page): Promise<CookieResult[]> {
  try {
    const cookieString = await page.evaluate(() => {
      return document.cookie
    })

    // Parse cookie string
    const cookies: CookieResult[] = cookieString
      .split(";")
      .filter((c) => c.trim())
      .map((c) => {
        const [name, ...valueParts] = c.trim().split("=")
        return {
          name: name.trim(),
          value: valueParts.join("=").trim(),
          domain: window.location.hostname,
          path: "/",
        }
      })

    return cookies
  } catch (error) {
    console.error("JavaScript extraction error:", error)
    return []
  }
}

/**
 * Identify critical/important cookies
 * @param cookies - All extracted cookies
 * @returns Array of critical cookie names
 */
export function identifyCriticalCookies(cookies: CookieResult[]): string[] {
  const critical: Set<string> = new Set()

  cookies.forEach((cookie) => {
    // Check pattern matching
    const matchesPattern = CRITICAL_PATTERNS.some((pattern) => pattern.test(cookie.name))

    // Check value length (session tokens are typically long)
    const isLongValue = cookie.value.length > 80

    // Check for JWT format (eyJ...)
    const isJWT = cookie.value.startsWith("eyJ")

    // Check for encoded data (base64-like)
    const isEncoded = /^[A-Za-z0-9+/=_-]+$/.test(cookie.value) && cookie.value.length > 50

    if (matchesPattern || isLongValue || isJWT || isEncoded) {
      critical.add(cookie.name)
    }
  })

  return Array.from(critical)
}

/**
 * Extract session tokens (long-valued cookies)
 * @param cookies - All cookies
 * @returns Session tokens with their lengths
 */
export function extractSessionTokens(cookies: CookieResult[]): { name: string; value: string; length: number }[] {
  return cookies
    .filter((cookie) => cookie.value.length > 100)
    .map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      length: cookie.value.length,
    }))
    .sort((a, b) => b.length - a.length)
}

/**
 * Build complete cookie header string
 * @param cookies - Cookie array
 * @returns HTTP Cookie header format
 */
export function buildCookieString(cookies: CookieResult[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ")
}

/**
 * Build complete Set-Cookie header format
 * @param cookies - Cookie array
 * @returns Set-Cookie format for all cookies
 */
export function buildSetCookieString(cookies: CookieResult[]): string[] {
  return cookies.map((c) => {
    let header = `${c.name}=${c.value}`

    if (c.domain) header += `; Domain=${c.domain}`
    if (c.path) header += `; Path=${c.path}`
    if (c.expires) header += `; Expires=${new Date(c.expires * 1000).toUTCString()}`
    if (c.httpOnly) header += "; HttpOnly"
    if (c.secure) header += "; Secure"
    if (c.sameSite) header += `; SameSite=${c.sameSite}`

    return header
  })
}

/**
 * Universal login handler - Works with most websites
 * @param page - Playwright page
 * @param loginUrl - Login page URL
 * @param targetUrl - Target website URL
 * @param credentials - Username/email and password
 * @returns Login success status
 */
export async function universalLogin(
  page: Page,
  loginUrl: string,
  targetUrl: string,
  credentials: { username: string; password: string },
): Promise<boolean> {
  try {
    // Navigate to login
    console.log(`[*] Navigating to: ${loginUrl}`)
    await page.goto(loginUrl, { waitUntil: "networkidle", timeout: 30000 })
    await page.waitForTimeout(1500)

    // Find and fill username/email field (Multiple selectors)
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="email"]',
      'input[name="login"]',
      'input[name="user"]',
      'input[type="email"]',
      'input[id*="username"]',
      'input[id*="email"]',
      'input[id*="login"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      'input[placeholder*="login" i]',
    ]

    let usernameFilled = false
    for (const selector of usernameSelectors) {
      const element = await page.$(selector)
      if (element && (await element.isVisible().catch(() => false))) {
        console.log(`[+] Found username field: ${selector}`)
        await page.fill(selector, credentials.username)
        usernameFilled = true
        await page.waitForTimeout(500)
        break
      }
    }

    if (!usernameFilled) {
      throw new Error("Username/email field not found")
    }

    // Find and fill password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[name="pass"]',
      'input[id*="password"]',
    ]

    let passwordFilled = false
    for (const selector of passwordSelectors) {
      const element = await page.$(selector)
      if (element && (await element.isVisible().catch(() => false))) {
        console.log(`[+] Found password field: ${selector}`)
        await page.fill(selector, credentials.password)
        passwordFilled = true
        await page.waitForTimeout(500)
        break
      }
    }

    if (!passwordFilled) {
      throw new Error("Password field not found")
    }

    // Click login button
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Submit")',
      'input[type="submit"]',
      'button[name*="login"]',
      'button[id*="login"]',
      'button:has-text("Log In")',
      'a:has-text("Login")',
      'a[role="button"]:has-text("Login")',
    ]

    let loginClicked = false
    for (const selector of loginButtonSelectors) {
      const element = await page.$(selector)
      if (element && (await element.isVisible().catch(() => false))) {
        console.log(`[+] Found login button: ${selector}`)
        await element.click()
        loginClicked = true
        break
      }
    }

    if (!loginClicked) {
      throw new Error("Login button not found")
    }

    // Wait for navigation and page load
    console.log("[*] Waiting for login to complete...")
    await page.waitForTimeout(3000)

    try {
      await page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {})
    } catch (e) {
      console.log("[!] Navigation timeout - continuing anyway")
    }

    // Navigate to target URL
    console.log(`[*] Navigating to target: ${targetUrl}`)
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 })
    await page.waitForTimeout(2000)

    console.log("[✓] Login successful!")
    return true
  } catch (error) {
    console.error("[✗] Login failed:", error)
    throw error
  }
}

/**
 * Complete extraction with all methods
 * @param page - Playwright page
 * @param context - Browser context
 * @param loginUrl - Login page
 * @param targetUrl - Target website
 * @param credentials - Login credentials
 * @returns Complete extraction result
 */
export async function performCompleteExtraction(
  page: Page,
  context: BrowserContext,
  loginUrl: string,
  targetUrl: string,
  credentials: { username: string; password: string },
): Promise<ExtractionResult> {
  try {
    // Perform login
    await universalLogin(page, loginUrl, targetUrl, credentials)

    // Extract cookies using multiple methods
    console.log("[*] Extracting cookies - Method 1: Context cookies")
    const contextCookies = await extractAllCookies(context)

    console.log("[*] Extracting cookies - Method 2: JavaScript")
    const jsCookies = await extractViaJavaScript(page)

    // Merge cookies (context method is most reliable)
    const allCookies = contextCookies.length > 0 ? contextCookies : jsCookies

    if (allCookies.length === 0) {
      throw new Error("No cookies extracted from any method")
    }

    // Identify critical cookies
    const criticalCookies = identifyCriticalCookies(allCookies)
    const sessionTokens = extractSessionTokens(allCookies)

    // Build cookie strings
    const cookieString = buildCookieString(allCookies)

    console.log(`[✓] Extracted ${allCookies.length} cookies (${criticalCookies.length} critical)`)

    return {
      status: "success",
      message: `Successfully extracted ${allCookies.length} cookies`,
      cookies: allCookies,
      cookieString: cookieString,
      importantCookies: criticalCookies,
      cookieCount: allCookies.length,
      sessionTokens: sessionTokens,
      extractedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: "error",
      message: `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      extractedAt: new Date().toISOString(),
    }
  }
}

/**
 * Send results to webhook
 * @param webhookUrl - n8n webhook endpoint
 * @param result - Extraction result
 * @returns Success status
 */
export async function sendToWebhook(webhookUrl: string, result: ExtractionResult): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        extractionResult: result,
        totalCookies: result.cookieCount,
        criticalCookies: result.importantCookies?.length || 0,
        sessionTokens: result.sessionTokens?.length || 0,
        cookieStringLength: result.cookieString?.length || 0,
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[✗] Webhook send failed:", error)
    return false
  }
}

/**
 * Complete workflow
 */
export async function runCompleteWorkflow(
  page: Page,
  context: BrowserContext,
  targetUrl: string,
  loginUrl: string,
  username: string,
  password: string,
  webhookUrl: string,
): Promise<ExtractionResult> {
  const result = await performCompleteExtraction(page, context, loginUrl, targetUrl, {
    username,
    password,
  })

  if (result.status === "success") {
    const webhookSent = await sendToWebhook(webhookUrl, result)
    result.webhookSent = webhookSent
  }

  return result
}
