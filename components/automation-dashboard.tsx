"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Cookie, Lock, Copy, Check, AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react"

interface CookieResult {
  name: string
  value: string
  domain: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
}

interface AutomationResult {
  status: "success" | "error"
  message?: string
  cookies?: CookieResult[]
  cookieString?: string
  importantCookies?: string[]
  webhookSent?: boolean
  securityChallenges?: {
    cloudflareDetected: boolean
    captchaDetected: boolean
  }
}

export function AutomationDashboard() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    loginUrl: "",
    username: "",
    password: "",
    webhookUrl: "",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AutomationResult | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [showAllCookies, setShowAllCookies] = useState(true)
  const [copiedString, setCopiedString] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        status: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyCookie = (cookie: CookieResult, index: number) => {
    navigator.clipboard.writeText(`${cookie.name}=${cookie.value}`)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAllCookies = () => {
    if (result?.cookieString) {
      navigator.clipboard.writeText(result.cookieString)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    }
  }

  const copyCookieString = () => {
    if (result?.cookieString) {
      navigator.clipboard.writeText(result.cookieString)
      setCopiedString(true)
      setTimeout(() => setCopiedString(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
                <Cookie className="w-4 h-4 text-background" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Extractor</span>
            </div>
            <div className="h-4 w-[1px] bg-border mx-2" />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Personal</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">Automation</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-xs">
              Docs
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 text-xs font-medium"
            >
              Feedback
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Cookie Extraction</h1>
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-widest font-bold h-5"
              >
                Full Access
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Extract every single cookie including high-entropy session tokens, CSRF identifiers, and authentication
              payloads with zero truncation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 border-border bg-card">
              View Logs
            </Button>
            <Button size="sm" className="h-9 bg-foreground text-background hover:bg-foreground/90">
              Settings
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border bg-card shadow-none overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider opacity-70">
                    Configuration
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="targetUrl"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Target URL
                    </Label>
                    <Input
                      id="targetUrl"
                      className="bg-background border-border focus-visible:ring-1 focus-visible:ring-foreground transition-all h-10"
                      placeholder="https://example.com"
                      value={formData.targetUrl}
                      onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="loginUrl"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Login Page URL
                    </Label>
                    <Input
                      id="loginUrl"
                      className="bg-background border-border focus-visible:ring-1 focus-visible:ring-foreground transition-all h-10"
                      placeholder="https://example.com/login/"
                      value={formData.loginUrl}
                      onChange={(e) => setFormData({ ...formData, loginUrl: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Username / Email
                    </Label>
                    <Input
                      id="username"
                      className="bg-background border-border focus-visible:ring-1 focus-visible:ring-foreground transition-all h-10"
                      placeholder="your_username or email"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      className="bg-background border-border focus-visible:ring-1 focus-visible:ring-foreground transition-all h-10"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="webhookUrl"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      n8n Webhook URL
                    </Label>
                    <Input
                      id="webhookUrl"
                      className="bg-background border-border focus-visible:ring-1 focus-visible:ring-foreground transition-all h-10"
                      placeholder="https://n8n.mydomain.com/webhook/cookies"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Automation...
                      </>
                    ) : (
                      "Start Extraction"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {result?.status === "error" && result.message?.includes("CAPTCHA") && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-destructive">CAPTCHA Detected</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The website has triggered a visual verification challenge. Automation cannot bypass this
                      automatically.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 bg-transparent"
                  >
                    Open Browser Manually
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <Card className="border-border bg-card shadow-none h-full flex flex-col">
              <CardHeader className="border-b border-border/50 bg-muted/30 flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                  <Cookie className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider opacity-70">
                    Extracted Payloads
                  </CardTitle>
                </div>
                {result?.cookies && (
                  <Badge
                    variant="outline"
                    className="h-6 px-2 rounded-full border-border bg-background text-[10px] font-mono"
                  >
                    {result.cookies.length} ITEMS
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {!result && !loading && (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Cookie className="w-6 h-6 opacity-40" />
                    </div>
                    <p className="text-sm font-medium">No payloads extracted</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                      Configure the target and start the automation to begin capturing session data.
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="font-medium text-muted-foreground">Logging in and extracting cookies...</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Capturing ALL cookies with complete values - No truncation or limits
                      </p>
                    </div>
                  </div>
                )}

                {result && result.securityChallenges?.cloudflareDetected && (
                  <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 animate-pulse">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-500">Cloudflare Challenge Handled</p>
                        <p className="text-xs text-muted-foreground">
                          A security checkbox was detected and automatically resolved during login.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge variant={result.status === "success" ? "default" : "destructive"}>{result.status}</Badge>
                      {result.cookies && (
                        <Badge variant="secondary" className="font-semibold">
                          {result.cookies.length} Cookies Extracted
                        </Badge>
                      )}
                      {result.webhookSent !== undefined && (
                        <Badge variant={result.webhookSent ? "default" : "secondary"}>
                          {result.webhookSent ? "Webhook Sent ✓" : "Webhook Failed"}
                        </Badge>
                      )}
                    </div>

                    {result.message && <p className="text-sm text-muted-foreground">{result.message}</p>}

                    {result.importantCookies && result.importantCookies.length > 0 && (
                      <div className="space-y-2 rounded-lg border-2 border-primary/30 bg-primary/10 p-4">
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-primary" />
                          <p className="text-base font-bold text-primary">
                            🔒 Critical Cookies Extracted ({result.importantCookies.length}):
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.importantCookies.map((name, i) => (
                            <Badge key={i} variant="default" className="font-mono text-xs font-semibold">
                              {name}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Session cookies with full values (can be 900+ characters), CSRF tokens, authentication data -
                          All extracted completely
                        </p>
                      </div>
                    )}

                    {result.cookies && result.cookies.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-bold">✅ Complete Cookie Extraction</p>
                            <p className="text-xs text-muted-foreground">
                              {result.cookies.length} total cookies extracted - Every cookie with full value (no
                              character limits)
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={showAllCookies ? "default" : "outline"}
                              onClick={() => setShowAllCookies(!showAllCookies)}
                            >
                              {showAllCookies
                                ? `All (${result.cookies.length})`
                                : `Critical (${result.importantCookies?.length || 0})`}
                            </Button>
                            <Button size="sm" variant="outline" onClick={copyAllCookies}>
                              {copiedAll ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3 w-3" /> Copy All
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-96 space-y-2 overflow-auto rounded-lg border bg-muted/30 p-3">
                          {result.cookies
                            .filter((cookie) => {
                              if (showAllCookies) return true
                              return result.importantCookies?.includes(cookie.name)
                            })
                            .map((cookie, index) => {
                              const isImportant = result.importantCookies?.includes(cookie.name)
                              const isVeryLong = cookie.value.length > 100
                              return (
                                <div
                                  key={index}
                                  className={`rounded-lg border p-3 text-sm transition-colors ${
                                    isImportant ? "border-primary/40 bg-primary/5" : "bg-background"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-mono text-base font-bold">{cookie.name}</p>
                                        {isImportant && (
                                          <Badge variant="default" className="text-xs font-semibold">
                                            🔥 CRITICAL
                                          </Badge>
                                        )}
                                        {isVeryLong && (
                                          <Badge variant="secondary" className="text-xs font-semibold">
                                            📏 {cookie.value.length} characters
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <p className="break-all rounded-md border bg-muted p-2 font-mono text-xs leading-relaxed">
                                          {cookie.value}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <span className="font-semibold">
                                            Full Length: {cookie.value.length} chars
                                          </span>
                                          {isVeryLong && (
                                            <Badge variant="outline" className="text-xs">
                                              ✓ Complete Session Token
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="rounded bg-muted px-2 py-0.5 font-mono font-medium">
                                          {cookie.domain}
                                        </span>
                                        {cookie.path && (
                                          <span className="text-muted-foreground">Path: {cookie.path}</span>
                                        )}
                                        {cookie.httpOnly && (
                                          <Badge variant="outline" className="text-xs">
                                            HttpOnly
                                          </Badge>
                                        )}
                                        {cookie.secure && (
                                          <Badge variant="outline" className="text-xs">
                                            Secure
                                          </Badge>
                                        )}
                                        {cookie.expires && (
                                          <span className="text-muted-foreground">
                                            Expires: {new Date(cookie.expires * 1000).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => copyCookie(cookie, index)}
                                      title={`Copy ${cookie.name}=${cookie.value}`}
                                    >
                                      {copiedIndex === index ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                        {!showAllCookies && result.cookies.length > (result.importantCookies?.length || 0) && (
                          <p className="text-center text-xs text-muted-foreground">
                            Showing {result.importantCookies?.length || 0} critical cookies of {result.cookies.length}{" "}
                            total - Click "All" to view complete extraction
                          </p>
                        )}
                      </div>
                    )}

                    {result.cookieString && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Full Cookie String (HTTP Cookie Header Format):</p>
                          <Button size="sm" variant="outline" onClick={copyCookieString}>
                            {copiedString ? (
                              <>
                                <Check className="mr-1 h-3 w-3 text-green-500" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3 w-3" /> Copy String
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <pre className="max-h-32 overflow-auto rounded-lg border bg-muted p-3 font-mono text-xs leading-relaxed">
                            {result.cookieString}
                          </pre>
                          <p className="text-xs text-muted-foreground">
                            Total length: <span className="font-bold text-primary">{result.cookieString.length}</span>{" "}
                            characters - Complete cookie string ready for HTTP Cookie header (all values included)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
