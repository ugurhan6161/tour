"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import DriverDashboard from "@/components/driver/driver-dashboard"

export default function DriverPage() {
  const [profile, setProfile] = useState(null)
  const [driver, setDriver] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function loadDriverData() {
      try {
        console.log("[v0] Driver page: Starting authentication check")
        const supabase = createClient()

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error("[v0] Driver page: No authenticated user:", userError)
          router.push("/auth/login")
          return
        }

        console.log("[v0] Driver page: User authenticated:", user.id)

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError || !profileData) {
          console.error("[v0] Driver page: Error fetching profile:", profileError)
          router.push("/auth/login")
          return
        }

        if (profileData.role !== "driver") {
          console.error("[v0] Driver page: User is not a driver:", profileData.role)
          router.push("/auth/login")
          return
        }

        setProfile(profileData)
        console.log("[v0] Driver page: Profile obtained:", profileData.id)

        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("*")
          .eq("user_id", profileData.id)
          .single()

        console.log("[v0] Driver page: Driver query result:", { driver: driverData, driverError })

        if (driverError || !driverData) {
          console.error("[v0] Driver page: Error fetching driver or no driver found:", driverError)
          router.push("/auth/login")
          return
        }

        setDriver(driverData)

        const { data: tasksData, error: tasksError } = await supabase
          .from("driver_tasks_view")
          .select("*")
          .eq("assigned_driver_id", profileData.id)
          .order("pickup_date", { ascending: true })

        console.log("[v0] Driver page: Tasks query result:", { tasksCount: tasksData?.length, tasksError })

        if (tasksError) {
          console.error("[v0] Driver page: Error fetching tasks:", tasksError)
          setTasks([]) // Set empty array on error
        } else {
          setTasks(tasksData || [])
        }

        console.log("[v0] Driver page: Data loaded successfully")
      } catch (error) {
        console.error("[v0] Driver page: Unexpected error:", error)
        setError(error.message)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    loadDriverData()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Şöför paneli yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Hata: {error}</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    )
  }

  if (!profile || !driver) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Veri yükleniyor...</p>
        </div>
      </div>
    )
  }

  return <DriverDashboard profile={profile} driver={driver} initialTasks={tasks} />
}
