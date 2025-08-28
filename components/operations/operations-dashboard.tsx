"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Users, Calendar, MapPin, LogOut, RefreshCw, Activity, Clock, CheckCircle, XCircle, Navigation, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import TaskCreationForm from "./task-creation-form";
import TasksTable from "./tasks-table";
import DriversManagement from "./drivers-management";

interface OperationsDashboardProps {
  profile: any;
  initialTasks: any[];
  drivers: any[];
}

export default function OperationsDashboard({ profile, initialTasks, drivers }: OperationsDashboardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentDrivers, setCurrentDrivers] = useState(drivers);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false); // Collapsible state
  const supabase = createClient();

  const refreshTasks = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("driver_tasks_view")
        .select("*")
        .order("pickup_date", { ascending: true });

      if (error) {
        console.error("[OperationsDashboard] Error refreshing tasks:", error);
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error("[OperationsDashboard] Unexpected error refreshing tasks:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          drivers (*)
        `)
        .eq("role", "driver");

      if (error) {
        console.error("[OperationsDashboard] Error refreshing drivers:", error);
      } else {
        setCurrentDrivers(data || []);
      }
    } catch (error) {
      console.error("[OperationsDashboard] Unexpected error refreshing drivers:", error);
    }
  };

  const handleDriverUpdate = () => {
    refreshDrivers();
  };

  const getStatusCount = (status: string) => {
    return tasks.filter((task) => task.status === status).length;
  };

  const getTodaysTasks = () => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((task) => task.pickup_date === today).length;
  };

  const getUnassignedTasks = () => {
    return tasks.filter((task) => !task.assigned_driver_id).length;
  };

  const getActiveDrivers = () => {
    return currentDrivers.filter((driver) => {
      const driverInfo = driver.drivers || driver;
      return driverInfo?.is_active === true;
    }).length;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("[OperationsDashboard] Error logging out:", error);
    }
  };

  if (showCreateForm) {
    return (
      <TaskCreationForm
        drivers={drivers}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          refreshTasks();
        }}
        profile={profile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-blue-500/20">
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg">
                  {profile.full_name?.charAt(0) || "O"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Operasyon Paneli</h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Hoş geldiniz, {profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap overflow-x-hidden">
              <Button
                onClick={refreshTasks}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="hidden sm:flex items-center space-x-2 hover:bg-blue-50 border-blue-200"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </Button>
              <Button 
                onClick={refreshTasks} 
                variant="outline" 
                size="sm" 
                disabled={isRefreshing}
                className="sm:hidden p-1.5 hover:bg-blue-50 border-blue-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Görev</span>
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="sm:hidden p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="sm:hidden p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Statistics Cards (Collapsible, Smaller in Mobile) */}
        <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex items-center justify-between bg-white/90 border-blue-200 hover:bg-blue-50 text-gray-800"
            >
              <span className="text-sm font-semibold">İstatistikleri {isStatsOpen ? "Gizle" : "Göster"}</span>
              {isStatsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 transition-all duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-3">
              <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-1.5 sm:p-3">
                  <div className="text-center">
                    <div className="p-1 sm:p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md inline-block mb-1 sm:mb-2">
                      <Activity className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className="text-base sm:text-xl font-bold text-blue-600 mb-0.5">{tasks.length}</p>
                    <p className="text-[9px] sm:text-xs font-medium text-gray-600">Toplam Görev</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-1.5 sm:p-3">
                  <div className="text-center">
                    <div className="p-1 sm:p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg shadow-md inline-block mb-1 sm:mb-2">
                      <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className="text-base sm:text-xl font-bold text-orange-600 mb-0.5">{getTodaysTasks()}</p>
                    <p className="text-[9px] sm:text-xs font-medium text-gray-600">Bugün</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-1.5 sm:p-3">
                  <div className="text-center">
                    <div className="p-1 sm:p-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg shadow-md inline-block mb-1 sm:mb-2">
                      <Calendar className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className="text-base sm:text-xl font-bold text-yellow-600 mb-0.5">{getUnassignedTasks()}</p>
                    <p className="text-[9px] sm:text-xs font-medium text-gray-600">Atanmamış</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-1.5 sm:p-3">
                  <div className="text-center">
                    <div className="p-1 sm:p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-md inline-block mb-1 sm:mb-2">
                      <CheckCircle className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className="text-base sm:text-xl font-bold text-green-600 mb-0.5">{getStatusCount("completed")}</p>
                    <p className="text-[9px] sm:text-xs font-medium text-gray-600">Tamamlanan</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-1.5 sm:p-3">
                  <div className="text-center">
                    <div className="p-1 sm:p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-md inline-block mb-1 sm:mb-2">
                      <XCircle className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className="text-base sm:text-xl font-bold text-red-600 mb-0.5">{getStatusCount("cancelled")}</p>
                    <p className="text-[9px] sm:text-xs font-medium text-gray-600">İptal Edilen</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300">
                <CardContent className="p-1.5 sm:p-3">
                  <div className="text-center">
                    <div className="p-1 sm:p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg shadow-md inline-block mb-1 sm:mb-2">
                      <Users className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className="text-base sm:text-xl font-bold text-purple-600 mb-0.5">{getActiveDrivers()}</p>
                    <p className="text-[9px] sm:text-xs font-medium text-gray-600">Aktif Şoför</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Main Content Tabs */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b p-2 sm:p-3">
              <TabsList className="grid w-full grid-cols-3 bg-white/50 rounded-lg p-1">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-md text-[10px] sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  📊 Genel Bakış
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="rounded-md text-[10px] sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  📋 Tüm Görevler
                </TabsTrigger>
                <TabsTrigger 
                  value="drivers" 
                  className="rounded-md text-[10px] sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  👥 Şoförler
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-0">
              <TabsContent value="overview" className="mt-0 p-2 sm:p-6 space-y-4 sm:space-y-6">
                {/* Recent Tasks (Scrollable) */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 p-2 sm:p-3">
                    <CardTitle className="flex items-center space-x-2 text-gray-800">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      <span className="text-sm sm:text-base font-bold">Son Görevler</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {tasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 bg-blue-100 rounded-md">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-xs sm:text-sm text-gray-900">{task.title}</p>
                              <p className="text-[9px] sm:text-xs text-gray-600">
                                {task.customer_name} • {new Date(task.pickup_date).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-1.5 py-0.5 text-[9px] sm:text-xs rounded-full font-medium ${
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
                    {tasks.length === 0 && (
                      <div className="text-center py-6">
                        <div className="p-2 sm:p-3 bg-gray-100 rounded-full inline-block mb-2 sm:mb-3">
                          <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">Henüz görev bulunmuyor.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions (Moved to Bottom) */}
                <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="flex items-center space-x-2 text-gray-800">
                      <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      <span className="text-sm sm:text-base font-bold">Hızlı İşlemler</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                      <Button
                        onClick={() => setShowCreateForm(true)}
                        className="h-14 sm:h-16 flex flex-col items-center justify-center space-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">Yeni Görev Oluştur</span>
                      </Button>
                      <Button
                        onClick={() => setActiveTab("tasks")}
                        variant="outline"
                        className="h-14 sm:h-16 flex flex-col items-center justify-center space-y-1 border-2 border-blue-200 hover:bg-blue-50 shadow-md"
                      >
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <span className="text-xs sm:text-sm font-medium text-blue-700">Tüm Görevleri Görüntüle</span>
                      </Button>
                      <Button
                        onClick={() => setActiveTab("drivers")}
                        variant="outline"
                        className="h-14 sm:h-16 flex flex-col items-center justify-center space-y-1 border-2 border-purple-200 hover:bg-purple-50 shadow-md"
                      >
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <span className="text-xs sm:text-sm font-medium text-purple-700">Şoförleri Yönet</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <TasksTable tasks={tasks} drivers={drivers} onTaskUpdate={refreshTasks} profile={profile} />
              </TabsContent>

              <TabsContent value="drivers" className="mt-0">
                <DriversManagement drivers={currentDrivers} onDriverUpdate={handleDriverUpdate} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
