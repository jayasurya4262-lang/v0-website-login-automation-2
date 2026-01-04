import type { Page } from "playwright"

/**
 * Advanced Cloudflare Turnstile Solver
 * Based on Kameleo-io approach for clicking the verify checkbox
 */
export async function solveTurnstileChallenge(page: Page): Promise<{
  success: boolean
  message: string
  method?: string
}> {
  try {
    console.log("[v0] Starting Cloudflare Turnstile detection...")

    // Check if Cloudflare is present
    const isCloudflare = await page.evaluate(() => {
      return !!(
        document.querySelector("#turnstile-wrapper") ||
        document.querySelector(".cf-turnstile") ||
        document.querySelector("iframe[src*='challenges.cloudflare.com']") ||
        document.title.includes("Cloudflare") ||
        document.body.innerText.includes("Verify you are human")
      )
    })

    if (!isCloudflare) {
      return { success: true, message: "No Cloudflare Turnstile detected" }
    }

    console.log("[v0] Cloudflare Turnstile detected. Attempting to solve...")

    // Strategy 1: Find the checkbox iframe and click it
    const frames = page.frames()
    const turnstileFrame = frames.find((f) => f.url().includes("challenges.cloudflare.com"))

    if (turnstileFrame) {
      console.log("[v0] Found Turnstile iframe, attempting to click checkbox...")

      try {
        // Find the checkbox inside the iframe
        // Note: It's often inside a shadow DOM or protected, so we use coordinate-based clicking if possible
        const checkboxSelector = 'input[type="checkbox"], #challenge-stage, .ctp-checkbox-container'
        const checkbox = await turnstileFrame.$(checkboxSelector)

        if (checkbox) {
          const box = await checkbox.boundingBox()
          if (box) {
            // Human-like mouse movement and click
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
            await page.waitForTimeout(Math.random() * 500 + 200)
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

            console.log("[v0] Clicked Turnstile checkbox via coordinates")

            // Wait for success
            await page.waitForTimeout(3000)
            return {
              success: true,
              message: "Clicked Turnstile checkbox successfully",
              method: "coordinate-click",
            }
          }
        }
      } catch (clickErr) {
        console.error("[v0] Frame click strategy failed:", clickErr)
      }
    }

    // Strategy 2: Direct selector clicking (fallback)
    const selectors = [
      "iframe[src*='challenges.cloudflare.com']",
      "#turnstile-wrapper",
      ".cf-turnstile",
      "#challenge-stage",
    ]

    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element && (await element.isVisible())) {
          const box = await element.boundingBox()
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
            await page.waitForTimeout(3000)
            return { success: true, message: "Clicked Turnstile via selector", method: "selector-click" }
          }
        }
      } catch (e) {}
    }

    return { success: false, message: "Detected Cloudflare but could not solve automatically" }
  } catch (error) {
    console.error("[v0] Turnstile solver error:", error)
    return {
      success: false,
      message: `Error solving Turnstile: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
