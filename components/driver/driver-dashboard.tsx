"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import TaskCard from "./task-card";
import TaskDetails from "./task-details";
import { 
  Phone, 
  Car, 
  User, 
  Calendar, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Search,
  RefreshCw,
  Bus,
  Navigation,
  Clock,
  MapPin,
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  customer_name: string;
  customer_phone: string;
  customer_notes: string;
  status: string;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  created_at: string;
}

interface DriverDashboardProps {
  profile: any;
  driver: any;
  initialTasks: Task[];
}

export default function DriverDashboard({ profile, driver, initialTasks }: DriverDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDriverActive, setIsDriverActive] = useState(driver?.is_active || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDriverInfoExpanded, setIsDriverInfoExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Simüle edilmiş yükleme durumu (initialTasks, profile, driver zaten yüklendi, ancak UI için gecikme ekleyelim)
    const timer = setTimeout(() => {
      if (!profile || !driver || !initialTasks) {
        setError("Veriler eksik, lütfen tekrar deneyin.");
      }
      setLoading(false);
    }, 1000); // 1 saniyelik simüle edilmiş yükleme

    return () => clearTimeout(timer);
  }, [profile, driver, initialTasks]);

  const refreshTasks = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("driver_tasks_view")
        .select("*")
        .eq("assigned_driver_id", profile.id)
        .order("pickup_date", { ascending: true });

      if (error) {
        console.error("[DriverDashboard] Error refreshing tasks:", error);
        setError("Görevler yenilenirken hata oluştu.");
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error("[DriverDashboard] Unexpected error refreshing tasks:", error);
      setError("Beklenmeyen bir hata oluştu.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("[DriverDashboard] Error logging out:", error);
      setError("Çıkış yaparken hata oluştu.");
    }
  };

  const toggleDriverStatus = async (newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active: newStatus })
        .eq("user_id", profile.id);

      if (error) {
        console.error("[DriverDashboard] Error updating driver status:", error);
        setError("Şoför durumu güncellenirken hata oluştu.");
      } else {
        setIsDriverActive(newStatus);
      }
    } catch (error) {
      console.error("[DriverDashboard] Unexpected error updating driver status:", error);
      setError("Beklenmeyen bir hata oluştu.");
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = activeFilter === "all" || task.status === activeFilter;
    const matchesSearch =
      searchQuery === "" ||
      task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      case "assigned":
        return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
      case "in_progress":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse";
      case "completed":
        return "bg-gradient-to-r from-emerald-600 to-green-600 text-white";
      case "cancelled":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white";
    }
  };

  const getStatusCount = (status: string) => {
    return tasks.filter((task) => task.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Map Pin */}
            <div className="absolute animate-pulse">
              <MapPin className="h-12 w-12 text-red-500" />
            </div>
            {/* Moving Car */}
            <div className="relative animate-[moveCar_2s_ease-in-out_infinite]">
              <Car className="h-8 w-8 text-blue-600 transform rotate-45" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-800">Şoför Paneli Yükleniyor...</p>
          <p className="text-sm text-gray-500 animate-pulse">Görevleriniz hazırlanıyor, lütfen bekleyin.</p>
        </div>
        <style jsx>{`
          @keyframes moveCar {
            0%, 100% { transform: translateX(-20px) rotate(45deg); }
            50% { transform: translateX(20px) rotate(45deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
          <p className="text-lg font-semibold text-gray-800">Hata Oluştu</p>
          <p className="text-sm text-gray-600">{error}</p>
          <Button
            onClick={() => window.location.href = "/auth/login"}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Giriş Sayfasına Dön
          </Button>
        </div>
      </div>
    );
  }

  if (!profile || !driver || !tasks) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-center">
            <Car className="h-12 w-12 text-blue-500 animate-bounce" />
          </div>
          <p className="text-lg font-semibold text-gray-800">Veriler Yükleniyor...</p>
          <p className="text-sm text-gray-600">Lütfen biraz daha bekleyin.</p>
        </div>
      </div>
    );
  }

  if (selectedTask) {
    return (
      <TaskDetails
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onTaskUpdate={refreshTasks}
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
                          <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                {isDriverActive ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <Switch
                  checked={isDriverActive}
                  onCheckedChange={toggleDriverStatus}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <Bus className="h-5 w-5 text-blue-600" />
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Tur Şoför Paneli</h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Hoş geldiniz, {profile.full_name}</p>
              </div>
            </div>

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
                className="sm:hidden p-2 hover:bg-blue-50 border-blue-200"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                className="sm:hidden p-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Driver Status Card with Collapsible Content */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden p-3 sm:p-4">
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}></div>
            </div>
            <div className="flex items-center justify-between relative z-10">
              <CardTitle 
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => setIsDriverInfoExpanded(!isDriverInfoExpanded)}
              >
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium opacity-90">Şoför Durumu</div>
                  <div className="text-base sm:text-lg font-bold">Transfer Operatörü</div>
                </div>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10 p-1"
                onClick={() => setIsDriverInfoExpanded(!isDriverInfoExpanded)}
              >
                {isDriverInfoExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            {/* Dashboard Stats - Always visible on header */}
            <div className="mt-3 relative z-10">
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold">{getStatusCount("new")}</div>
                  <div className="text-xs opacity-90">Yeni</div>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold">{getStatusCount("assigned")}</div>
                  <div className="text-xs opacity-90">Bekleyen</div>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold">{getStatusCount("in_progress")}</div>
                  <div className="text-xs opacity-90">Aktif</div>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold">{getStatusCount("completed")}</div>
                  <div className="text-xs opacity-90">Biten</div>
                </div>
                <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold">{getStatusCount("cancelled")}</div>
                  <div className="text-xs opacity-90">İptal</div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          {isDriverInfoExpanded && (
            <CardContent className="p-4 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg shadow-lg flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-blue-600 mb-1">Şoför Adı</p>
                      <p className="font-bold text-slate-800 text-sm truncate">{profile.full_name}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg shadow-lg flex-shrink-0">
                      <Phone className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-green-600 mb-1">İletişim</p>
                      <p className="font-bold text-slate-800 text-sm truncate">
                        {profile.phone || "Belirtilmemiş"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500 rounded-lg shadow-lg flex-shrink-0">
                      <Car className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-purple-600 mb-1">Araç Plakası</p>
                      <p className="font-bold text-slate-800 text-sm truncate">
                        {driver?.vehicle_plate || "Belirtilmemiş"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Search and Filter */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Müşteri adı, konum ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-lg border-2 border-gray-200 focus:border-blue-400 bg-white/50"
                />
              </div>
              <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 bg-gray-100/50 rounded-lg p-1">
                  <TabsTrigger 
                    value="all" 
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md"
                  >
                    🔍 Tümü
                  </TabsTrigger>
                  <TabsTrigger 
                    value="new" 
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    🆕 Yeni
                  </TabsTrigger>
                  <TabsTrigger 
                    value="assigned" 
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    ⏳ Bekleyen
                  </TabsTrigger>
                  <TabsTrigger 
                    value="in_progress" 
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    🚌 Aktif
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    ✅ Biten
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cancelled" 
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    ❌ İptal
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Scrollable Tasks List */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span className="text-base font-bold text-gray-800">
                Transfer Görevleri ({filteredTasks.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <div className="p-3 bg-gray-100 rounded-full inline-block mb-3">
                      <Calendar className="h-8 w-8 mx-auto" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    {activeFilter === "all" ? "🔍 Transfer Bulunamadı" : "📋 Filtreli Transfer Yok"}
                  </h3>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    {activeFilter === "all"
                      ? "Henüz size atanmış bir transfer görevi bulunmuyor. Yeni görevler için bekleyin."
                      : `${
                          activeFilter === "new"
                            ? "🆕 Yeni"
                            : activeFilter === "assigned"
                              ? "⏳ Bekleyen"
                              : activeFilter === "in_progress"
                                ? "🚌 Aktif"
                                : activeFilter === "completed"
                                  ? "✅ Tamamlanan"
                                  : "❌ İptal edilen"
                        } transfer görevi bulunamadı.`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        getStatusColor={getStatusColor}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
