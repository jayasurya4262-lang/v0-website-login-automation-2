"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Cookie, Send, Globe, Lock, User, Link2, Copy, Check } from "lucide-react"

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
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Cookie className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Login Automation & Cookie Extractor</h1>
          </div>
          <p className="text-balance text-muted-foreground">
            Automate website logins and extract <span className="font-bold text-primary">EVERY SINGLE COOKIE</span> -
            Session tokens (900+ chars), CSRF, auth, tracking - Complete extraction with zero limits
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>Enter the target website details and your webhook URL</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetUrl" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Target URL
                  </Label>
                  <Input
                    id="targetUrl"
                    placeholder="https://leetcode.com"
                    value={formData.targetUrl}
                    onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginUrl" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Login Page URL
                  </Label>
                  <Input
                    id="loginUrl"
                    placeholder="https://leetcode.com/accounts/login/"
                    value={formData.loginUrl}
                    onChange={(e) => setFormData({ ...formData, loginUrl: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username / Email
                  </Label>
                  <Input
                    id="username"
                    placeholder="your_username or email"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    n8n Webhook URL
                  </Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://n8n.mydomain.com/webhook/cookies"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting ALL Cookies...
                    </>
                  ) : (
                    <>
                      <Cookie className="mr-2 h-4 w-4" />
                      Start Automation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5" />
                Cookie Extraction Results
              </CardTitle>
              <CardDescription>
                100% Complete Extraction - ALL cookies captured including very long session tokens, CSRF, auth, and
                tracking cookies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex h-64 items-center justify-center text-center text-muted-foreground">
                  <div className="space-y-2">
                    <Cookie className="mx-auto h-12 w-12 opacity-20" />
                    <p className="font-medium">Run automation to extract all cookies</p>
                    <p className="text-xs">
                      Captures session tokens (including 900+ character tokens), CSRF, and all authentication data
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex h-64 flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium text-muted-foreground">Logging in and extracting cookies...</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Capturing ALL cookies with complete values - No truncation or limits
                    </p>
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
                            {result.cookies.length} total cookies extracted - Every cookie with full value (no character
                            limits)
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
                                        <span className="font-semibold">Full Length: {cookie.value.length} chars</span>
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

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>Complete automated login with comprehensive cookie extraction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: 1, title: "Configure", desc: "Enter website URL, login credentials, and n8n webhook endpoint" },
                { step: 2, title: "Automate", desc: "Playwright browser automates the complete login process" },
                {
                  step: 3,
                  title: "Extract ALL",
                  desc: "Every single cookie captured (session, CSRF, auth, tracking, etc.)",
                },
                { step: 4, title: "Forward", desc: "Complete cookie data sent to your n8n webhook instantly" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
