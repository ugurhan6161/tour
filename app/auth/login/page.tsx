"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPanel, setSelectedPanel] = useState<"driver" | "operations" | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPanel) {
      setError("Lütfen hangi panele giriş yapmak istediğinizi seçin")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Login attempt for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      console.log("[v0] Login successful, user ID:", data.user.id)

      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()

      console.log("[v0] Profile query result:", { profile, profileError })

      // If profile doesn't exist, create it
      if (profileError && profileError.code === "PGRST116") {
        console.log("[v0] Profile not found, creating new profile")

        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.email,
            role: "driver", // Default role
          })
          .select("role")
          .single()

        if (createError) {
          console.log("[v0] Profile creation failed:", createError)
          setError("Profil oluşturulamadı. Lütfen yöneticinizle iletişime geçin.")
          return
        }

        profile = newProfile
        console.log("[v0] Profile created successfully:", profile)
      } else if (profileError) {
        console.log("[v0] Profile query error:", profileError)
        setError("Profil sorgulanırken hata oluştu")
        return
      }

      if (!profile) {
        setError("Kullanıcı profili bulunamadı")
        return
      }

      console.log("[v0] User role:", profile.role, "Selected panel:", selectedPanel)

      if (selectedPanel === "driver" && profile.role !== "driver") {
        setError("Bu hesap şöför paneline erişim yetkisine sahip değil")
        return
      }

      if (selectedPanel === "operations" && !["operations", "admin"].includes(profile.role)) {
        setError("Bu hesap operasyon paneline erişim yetkisine sahip değil")
        return
      }

      console.log("[v0] Role check passed, redirecting to:", selectedPanel === "driver" ? "/driver" : "/operations")

      if (selectedPanel === "driver") {
        router.push("/driver")
      } else {
        router.push("/operations")
      }
      router.refresh()
    } catch (error: unknown) {
      console.log("[v0] Login error:", error)
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Geçersiz e-posta veya şifre")
        } else if (error.message.includes("Email not confirmed")) {
          setError("E-posta adresinizi doğrulamanız gerekiyor")
        } else {
          setError("Giriş yapılırken bir hata oluştu: " + error.message)
        }
      } else {
        setError("Bir hata oluştu")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-sm">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Tur Acentesi</CardTitle>
            <CardDescription className="text-gray-600">Hesabınıza giriş yapın</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedPanel ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Hangi panele giriş yapmak istiyorsunuz?</h3>
                  <p className="text-sm text-gray-600">Rolünüze uygun paneli seçin</p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => setSelectedPanel("driver")}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Şöför Paneline Giriş Yap
                  </Button>
                  <Button
                    onClick={() => setSelectedPanel("operations")}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Operasyon Paneline Giriş Yap
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedPanel === "driver" ? "🚗 Şöför Paneli" : "🏢 Operasyon Paneli"} seçildi
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPanel(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Değiştir
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      E-posta
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="sofor@turacente.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Şifre
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
                  )}
                  <Button
                    type="submit"
                    className={`w-full h-11 ${selectedPanel === "driver" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Giriş yapılıyor..."
                      : `${selectedPanel === "driver" ? "Şöför" : "Operasyon"} Paneline Giriş Yap`}
                  </Button>
                </form>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-600">
              Hesabınız yok mu?{" "}
              <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
                Yöneticinizle iletişime geçin
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
