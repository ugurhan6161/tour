"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Users, Calendar, MapPin, LogOut, RefreshCw, Activity, Clock, CheckCircle, XCircle, Navigation, BarChart3, ChevronDown, ChevronUp, Map, Route } from "lucide-react";
import TaskCreationForm from "./task-creation-form";
import TasksTable from "./tasks-table";
import DriversManagement from "./drivers-management";
import LiveOperationsMap from "./live-operations-map";
import RoutesPage from "@/components/driver/RoutesPage";

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
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Normalize driver data structure
  const normalizeDriverData = (driver: any) => {
    // Handle different data structures based on the other components
    if (driver.drivers) {
      // From operations-dashboard structure: profile with drivers nested
      return {
        user_id: driver.id,
        full_name: driver.full_name || "Bilinmeyen Şoför",
        phone: driver.phone || "",
        vehicle_plate: driver.drivers.vehicle_plate || driver.driver_info?.vehicle_plate || "",
        license_number: driver.drivers.license_number || driver.driver_info?.license_number || "",
        is_active: driver.drivers.is_active ?? driver.driver_info?.is_active ?? false
      };
    } else if (driver.driver_info) {
      // From drivers-management structure: profile with driver_info nested
      return {
        user_id: driver.id,
        full_name: driver.full_name || "Bilinmeyen Şoför",
        phone: driver.phone || "",
        vehicle_plate: driver.driver_info.vehicle_plate || "",
        license_number: driver.driver_info.license_number || "",
        is_active: driver.driver_info.is_active ?? false
      };
    } else {
      // Direct driver structure or fallback
      return {
        user_id: driver.id || driver.user_id,
        full_name: driver.full_name || "Bilinmeyen Şoför",
        phone: driver.phone || "",
        vehicle_plate: driver.vehicle_plate || "",
        license_number: driver.license_number || "",
        is_active: driver.is_active ?? false
      };
    }
  };

  // Normalize drivers data
  const normalizedDrivers = useMemo(() => {
    if (!drivers || !Array.isArray(drivers)) {
      console.error("[OperationsDashboard] Invalid drivers prop:", drivers);
      return [];
    }
    return drivers.map(normalizeDriverData);
  }, [drivers]);

  // Normalize currentDrivers data
  const normalizedCurrentDrivers = useMemo(() => {
    if (!currentDrivers || !Array.isArray(currentDrivers)) {
      console.error("[OperationsDashboard] Invalid currentDrivers:", currentDrivers);
      return [];
    }
    return currentDrivers.map(normalizeDriverData);
  }, [currentDrivers]);

  // Load locations with enhanced error handling
  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error loading locations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Handle empty table gracefully
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('Driver locations table appears to be empty or not exist, setting empty locations');
          setLocations([]);
          return;
        }
        
        throw error;
      }
      
      setLocations(data || []);
      console.log(`Loaded ${(data || []).length} locations`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error loading locations:", errorMessage);
      
      // Set empty locations instead of error state to prevent app crash
      setLocations([]);
      
      // Only set error if it's a serious issue, not empty data
      if (!errorMessage.includes('empty') && !errorMessage.includes('no rows')) {
        setError("Konumlar yüklenirken hata oluştu");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load routes with enhanced error handling
  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: routesData, error: routesError } = await supabase
        .from('tour_routes')
        .select(`
          *,
          route_places (
            id,
            route_id,
            place_name,
            order_index
          )
        `)
        .order('created_at', { ascending: false });

      if (routesError) {
        console.error('Supabase error loading routes:', {
          message: routesError.message,
          details: routesError.details,
          hint: routesError.hint,
          code: routesError.code
        });
        
        // Handle empty table gracefully
        if (routesError.code === 'PGRST116' || routesError.message.includes('relation') || routesError.message.includes('does not exist')) {
          console.log('Routes table appears to be empty or not exist, setting empty routes');
          setRoutes([]);
          return;
        }
        
        throw routesError;
      }
      
      setRoutes(routesData || []);
      console.log(`Loaded ${(routesData || []).length} routes`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error loading routes:", errorMessage);
      
      // Set empty routes instead of error state to prevent app crash
      setRoutes([]);
      
      // Only set error if it's a serious issue, not empty data
      if (!errorMessage.includes('empty') && !errorMessage.includes('no rows')) {
        setError("Rotalar yüklenirken hata oluştu");
      }
    } finally {
      setLoading(false);
    }
  };

  // Aktif sekme değiştiğinde verileri yükle
  useEffect(() => {
    if (activeTab === "map") {
      loadLocations();
    } else if (activeTab === "routes") {
      loadRoutes();
    }
  }, [activeTab]);

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
          id,
          full_name,
          phone,
          drivers (
            user_id,
            vehicle_plate,
            vehicle_model,
            vehicle_color,
            is_active
          )
        `)
        .eq("role", "driver");

      if (error) {
        console.error("[OperationsDashboard] Error refreshing drivers:", error);
        setCurrentDrivers([]);
      } else {
        setCurrentDrivers(data || []);
        console.log("[OperationsDashboard] Refreshed drivers:", JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error("[OperationsDashboard] Unexpected error refreshing drivers:", error);
      setCurrentDrivers([]);
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
    return normalizedCurrentDrivers.filter(driver => driver.is_active).length;
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
        drivers={normalizedDrivers}
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
              <TabsList className="grid grid-cols-3 md:grid-cols-5 bg-white/50 rounded-lg p-1 gap-1">
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
                  📋 Görevler
                </TabsTrigger>
                <TabsTrigger 
                  value="drivers" 
                  className="rounded-md text-[10px] sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  👥 Şoförler
                </TabsTrigger>
                <TabsTrigger 
                  value="map" 
                  className="rounded-md text-[10px] sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  🗺️ Harita
                </TabsTrigger>
                <TabsTrigger 
                  value="routes" 
                  className="rounded-md text-[10px] sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  🛣️ Rotalar
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
                      <Button
                        onClick={() => setActiveTab("map")}
                        variant="outline"
                        className="h-14 sm:h-16 flex flex-col items-center justify-center space-y-1 border-2 border-green-200 hover:bg-green-50 shadow-md"
                      >
                        <Map className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <span className="text-xs sm:text-sm font-medium text-green-700">Haritayı Görüntüle</span>
                      </Button>
                      <Button
                        onClick={() => setActiveTab("routes")}
                        variant="outline"
                        className="h-14 sm:h-16 flex flex-col items-center justify-center space-y-1 border-2 border-orange-200 hover:bg-orange-50 shadow-md"
                      >
                        <Route className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <span className="text-xs sm:text-sm font-medium text-orange-700">Rotaları Görüntüle</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <TasksTable
                  tasks={tasks}
                  drivers={normalizedDrivers}
                  onTaskUpdate={refreshTasks}
                  profile={profile}
                />
              </TabsContent>

              <TabsContent value="drivers" className="mt-0">
                <DriversManagement
                  drivers={normalizedCurrentDrivers}
                  onDriverUpdate={handleDriverUpdate}
                />
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <LiveOperationsMap
                  profile={profile}
                  drivers={normalizedCurrentDrivers}
                  tasks={tasks}
                />
              </TabsContent>

              <TabsContent value="routes" className="mt-0">
                <RoutesPage
                  routes={routes}
                  setRoutes={setRoutes}
                  profile={profile}
                  loading={loading}
                  setLoading={setLoading}
                  setError={setError}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}