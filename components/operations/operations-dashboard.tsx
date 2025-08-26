"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Users, Calendar, MapPin, LogOut } from "lucide-react"
import TaskCreationForm from "./task-creation-form"
import TasksTable from "./tasks-table"
import DriversManagement from "./drivers-management"

interface OperationsDashboardProps {
  profile: any
  initialTasks: any[]
  drivers: any[]
}

export default function OperationsDashboard({ profile, initialTasks, drivers }: OperationsDashboardProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentDrivers, setCurrentDrivers] = useState(drivers)
  const supabase = createClient()

  const refreshTasks = async () => {
    const { data } = await supabase.from("driver_tasks_view").select("*").order("pickup_date", { ascending: true })

    if (data) {
      setTasks(data)
    }
  }

  const refreshDrivers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(`
        *,
        drivers (*)
      `)
      .eq("role", "driver")

    if (data) {
      setCurrentDrivers(data)
    }
  }

  const handleDriverUpdate = () => {
    refreshDrivers()
  }

  const getStatusCount = (status: string) => {
    return tasks.filter((task) => task.status === status).length
  }

  const getTodaysTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.filter((task) => task.pickup_date === today).length
  }

  const getUnassignedTasks = () => {
    return tasks.filter((task) => !task.assigned_driver_id).length
  }

  const getActiveDrivers = () => {
    return currentDrivers.filter((driver) => {
      const driverInfo = driver.drivers || driver
      return driverInfo?.is_active === true
    }).length
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  if (showCreateForm) {
    return (
      <TaskCreationForm
        drivers={drivers}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false)
          refreshTasks()
        }}
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
                  {profile.full_name?.charAt(0) || "O"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Operasyon Paneli</h1>
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
              <Button onClick={() => setShowCreateForm(true)} className="hidden sm:flex bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Görev
              </Button>
              <Button onClick={() => setShowCreateForm(true)} className="sm:hidden p-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
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
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
                <p className="text-sm text-gray-500">Toplam Görev</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{getTodaysTasks()}</p>
                <p className="text-sm text-gray-500">Bugün</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{getUnassignedTasks()}</p>
                <p className="text-sm text-gray-500">Atanmamış</p>
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
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{getActiveDrivers()}</p>
                <p className="text-sm text-gray-500">Aktif Şoför</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="tasks">Tüm Görevler</TabsTrigger>
            <TabsTrigger value="drivers">Şoförler</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Hızlı İşlemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-6 w-6" />
                    <span>Yeni Görev Oluştur</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab("tasks")}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Calendar className="h-6 w-6" />
                    <span>Tüm Görevleri Görüntüle</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab("drivers")}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Users className="h-6 w-6" />
                    <span>Şoförleri Yönet</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Son Görevler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-gray-500">
                            {task.customer_name} • {new Date(task.pickup_date).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            task.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : task.status === "in_progress"
                                ? "bg-orange-100 text-orange-800"
                                : task.status === "assigned"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {task.status === "completed"
                            ? "TAMAMLANDI"
                            : task.status === "in_progress"
                              ? "DEVAM EDİYOR"
                              : task.status === "assigned"
                                ? "ATANDI"
                                : "YENİ"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTable tasks={tasks} drivers={drivers} onTaskUpdate={refreshTasks} profile={profile} />
          </TabsContent>

          <TabsContent value="drivers">
            <DriversManagement drivers={currentDrivers} onDriverUpdate={handleDriverUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
