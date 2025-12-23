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

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Cookie className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Login Automation</h1>
          </div>
          <p className="text-muted-foreground">
            Automate website logins, capture ALL session cookies (including CSRF tokens), and forward them to your n8n
            webhook
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
                    placeholder="https://example.com"
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
                    placeholder="https://example.com/login"
                    value={formData.loginUrl}
                    onChange={(e) => setFormData({ ...formData, loginUrl: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="your_username"
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
                      Automating Login...
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
                Results
              </CardTitle>
              <CardDescription>Complete cookie extraction - ALL cookies captured without limits</CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  <p>Run automation to see results</p>
                </div>
              )}

              {loading && (
                <div className="flex h-64 flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Logging in and extracting ALL cookies...</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant={result.status === "success" ? "default" : "destructive"}>{result.status}</Badge>
                    {result.webhookSent !== undefined && (
                      <Badge variant={result.webhookSent ? "default" : "secondary"}>
                        {result.webhookSent ? "Webhook Sent" : "Webhook Failed"}
                      </Badge>
                    )}
                  </div>

                  {result.message && <p className="text-sm text-muted-foreground">{result.message}</p>}

                  {result.importantCookies && result.importantCookies.length > 0 && (
                    <div className="space-y-2 rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-primary">
                          Critical Cookies Found ({result.importantCookies.length}):
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.importantCookies.map((name, i) => (
                          <Badge key={i} variant="default" className="text-xs font-medium">
                            {name}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These include session cookies, CSRF tokens, and authentication data
                      </p>
                    </div>
                  )}

                  {result.cookies && result.cookies.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">Complete Cookie Extraction ({result.cookies.length} total)</p>
                          <p className="text-xs text-muted-foreground">Every cookie captured - no limits applied</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={showAllCookies ? "default" : "outline"}
                            onClick={() => setShowAllCookies(!showAllCookies)}
                          >
                            {showAllCookies ? "All Cookies" : "Important Only"}
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
                      <div className="max-h-96 space-y-2 overflow-auto rounded-lg border p-2">
                        {result.cookies
                          .filter((cookie) => {
                            if (showAllCookies) return true
                            return result.importantCookies?.includes(cookie.name)
                          })
                          .map((cookie, index) => {
                            const isImportant = result.importantCookies?.includes(cookie.name)
                            return (
                              <div
                                key={index}
                                className={`rounded-lg border p-3 text-sm ${
                                  isImportant ? "border-primary/30 bg-primary/5" : "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{cookie.name}</p>
                                      {isImportant && (
                                        <Badge variant="default" className="text-xs">
                                          Critical
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-1 space-y-1">
                                      <p className="break-all rounded bg-background p-2 font-mono text-xs leading-relaxed">
                                        {cookie.value}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Length: {cookie.value.length} characters
                                      </p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <span className="font-medium">{cookie.domain}</span>
                                      {cookie.path && <span>Path: {cookie.path}</span>}
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
                                        <span>Expires: {new Date(cookie.expires * 1000).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => copyCookie(cookie, index)}
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
                      {!showAllCookies && (
                        <p className="text-center text-xs text-muted-foreground">
                          Showing {result.importantCookies?.length || 0} critical cookies of {result.cookies.length}{" "}
                          total
                        </p>
                      )}
                    </div>
                  )}

                  {result.cookieString && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cookie String (for HTTP headers):</p>
                      <div className="relative space-y-1">
                        <pre className="max-h-32 overflow-auto rounded-lg border bg-muted p-3 text-xs leading-relaxed">
                          {result.cookieString}
                        </pre>
                        <p className="text-xs text-muted-foreground">
                          Total length: {result.cookieString.length} characters
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
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: 1, title: "Submit", desc: "Enter website credentials and webhook URL" },
                { step: 2, title: "Login", desc: "Playwright automates the login process" },
                {
                  step: 3,
                  title: "Extract",
                  desc: "ALL cookies extracted (session, CSRF, auth, etc.)",
                },
                { step: 4, title: "Forward", desc: "Complete cookie data sent to your webhook" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {item.step}
                  </div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
