"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import TaskCard from "./task-card"
import TaskDetails from "./task-details"
import { Phone, Car, User, Calendar, LogOut, CheckCircle, XCircle } from "lucide-react"

interface Task {
  id: string
  title: string
  pickup_location: string
  dropoff_location: string
  pickup_date: string
  pickup_time: string
  customer_name: string
  customer_phone: string
  customer_notes: string
  status: string
  driver_name: string
  driver_phone: string
  vehicle_plate: string
  created_at: string
}

interface DriverDashboardProps {
  profile: any
  driver: any
  initialTasks: Task[]
}

export default function DriverDashboard({ profile, driver, initialTasks }: DriverDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDriverActive, setIsDriverActive] = useState(driver?.is_active || false)
  const supabase = createClient()

  const refreshTasks = async () => {
    const { data } = await supabase
      .from("driver_tasks_view")
      .select("*")
      .eq("assigned_driver_id", profile.id)
      .order("pickup_date", { ascending: true })

    if (data) {
      setTasks(data)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = activeFilter === "all" || task.status === activeFilter
    const matchesSearch =
      searchQuery === "" ||
      task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "assigned":
        return "bg-yellow-100 text-yellow-800"
      case "in_progress":
        return "bg-orange-100 text-orange-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusCount = (status: string) => {
    return tasks.filter((task) => task.status === status).length
  }

  const toggleDriverStatus = async (newStatus: boolean) => {
    try {
      const { error } = await supabase.from("drivers").update({ is_active: newStatus }).eq("user_id", profile.id)

      if (error) {
        console.error("Error updating driver status:", error)
      } else {
        setIsDriverActive(newStatus)
      }
    } catch (error) {
      console.error("Error updating driver status:", error)
    }
  }

  if (selectedTask) {
    return (
      <TaskDetails
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onTaskUpdate={refreshTasks}
        profile={profile}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  {profile.full_name?.charAt(0) || "Ş"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Şoför Paneli</h1>
                <p className="text-sm text-gray-500">Hoş geldiniz, {profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshTasks}
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center space-x-2 bg-transparent"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Yenile</span>
              </Button>
              <Button onClick={refreshTasks} variant="outline" size="sm" className="sm:hidden p-2 bg-transparent">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="sm:hidden p-2 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Driver Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span>Şoför Bilgileri</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{isDriverActive ? "Aktif" : "Pasif"}</span>
                <div className="flex items-center space-x-1">
                  {isDriverActive ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Switch
                    checked={isDriverActive}
                    onCheckedChange={toggleDriverStatus}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ad Soyad</p>
                  <p className="font-medium">{profile.full_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefon Numarası</p>
                  <p className="font-medium">{profile.phone || "Belirtilmemiş"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Car className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Araç Plakası</p>
                  <p className="font-medium">{driver?.vehicle_plate || "Belirtilmemiş"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{getStatusCount("new")}</p>
                <p className="text-sm text-gray-500">Yeni</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{getStatusCount("assigned")}</p>
                <p className="text-sm text-gray-500">Atanmış</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{getStatusCount("in_progress")}</p>
                <p className="text-sm text-gray-500">Devam Eden</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{getStatusCount("completed")}</p>
                <p className="text-sm text-gray-500">Tamamlanan</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{getStatusCount("cancelled")}</p>
                <p className="text-sm text-gray-500">İptal Edilen</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Müşteri adı veya konum ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 text-xs sm:text-sm">
                  <TabsTrigger value="all" className="px-2 py-1">
                    Tümü
                  </TabsTrigger>
                  <TabsTrigger value="new" className="px-2 py-1">
                    Yeni
                  </TabsTrigger>
                  <TabsTrigger value="assigned" className="px-2 py-1">
                    Atanmış
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="px-2 py-1">
                    Aktif
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="px-2 py-1">
                    Biten
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="px-2 py-1">
                    İptal
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Görev bulunamadı</h3>
                <p className="text-gray-500">
                  {activeFilter === "all"
                    ? "Henüz size atanmış bir görev bulunmuyor."
                    : `${
                        activeFilter === "new"
                          ? "Yeni"
                          : activeFilter === "assigned"
                            ? "Atanmış"
                            : activeFilter === "in_progress"
                              ? "Aktif"
                              : activeFilter === "completed"
                                ? "Tamamlanan"
                                : "İptal edilen"
                      } görev bulunamadı.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
                getStatusColor={getStatusColor}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
