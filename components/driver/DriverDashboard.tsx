// DriverDashboard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "./Header";
import DashboardPage from "./DashboardPage";
import TasksPage from "./TasksPage";
import MapPage from "./MapPage";
import RoutesPage from "./RoutesPage";
import TranslationPage from "./TranslationPage";
import RatingsPage from "./RatingsPage";
import TaskDetails from "./task-details";
import { AlertTriangle, Loader2, Car, MapPin, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Task, Location, TourRoute, DriverDashboardProps } from "./types";
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DriverDashboard({ profile, driver, initialTasks }: DriverDashboardProps) {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [locations, setLocations] = useState<Location[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [isDriverActive, setIsDriverActive] = useState(driver?.is_active || false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [translationText, setTranslationText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("tr");
  const [targetLang, setTargetLang] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);

  const supabase = createClient();

  // Real-time updates hook
  const {
    hasNewTasks,
    hasTaskUpdates,
    lastUpdateTime,
    isConnected,
    clearNewTasksFlag,
    clearTaskUpdatesFlag,
    triggerRefresh
  } = useRealTimeUpdates(profile?.id, {
    enableNotifications: true,
    enableLocationTracking: isDriverActive
  });

  // Location tracking hook
  const {
    location,
    error: locationError,
    isSupported: isLocationSupported,
    permissionStatus,
    requestPermission,
    refreshLocation,
    isTracking
  } = useLocationTracking(profile?.id, isDriverActive, {
    interval: 30000 // Update every 30 seconds
  });

  // Auto-refresh when real-time updates are received
  useEffect(() => {
    if (hasNewTasks || hasTaskUpdates) {
      refreshTasks();
    }
  }, [hasNewTasks, hasTaskUpdates]);

  // Clear flags when navigating to tasks page
  useEffect(() => {
    if (currentPage === "tasks") {
      clearNewTasksFlag();
      clearTaskUpdatesFlag();
    }
  }, [currentPage, clearNewTasksFlag, clearTaskUpdatesFlag]);

  useEffect(() => {
    loadLocations();
    loadRoutes();
  }, []);

  const loadLocations = async () => {
    try {
      if (!profile?.id) {
        console.log('No profile available, skipping location load');
        setLocations([]);
        return;
      }

      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', profile.id)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Supabase error loading locations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Don't set error state for empty table - just set empty locations
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('Location table appears to be empty or not exist, setting empty locations');
          setLocations([]);
          return;
        }
        
        throw error;
      }
      
      // Always set locations array, even if empty
      setLocations(data || []);
      console.log(`Loaded ${(data || []).length} location records`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error loading locations:", errorMessage);
      
      // Set empty locations instead of error state to prevent app crash
      setLocations([]);
      
      // Only set error if it's a serious issue, not empty data
      if (!errorMessage.includes('empty') && !errorMessage.includes('no rows')) {
        console.warn('Setting empty locations due to error, app will continue running');
      }
    }
  };

  const loadRoutes = async () => {
    try {
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
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (routesError) throw routesError;
      setRoutes(routesData || []);
    } catch (error) {
      console.error("Error loading routes:", error);
      setError("Rotalar yüklenirken hata oluştu");
    }
  };

  const refreshTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("driver_tasks_view")
        .select("*")
        .eq("assigned_driver_id", profile.id)
        .order("pickup_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Error refreshing tasks:", error);
      setError("Görevler yenilenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await Promise.all([
      refreshTasks(),
      loadLocations(),
      loadRoutes()
    ]);
    triggerRefresh();
    clearNewTasksFlag();
    clearTaskUpdatesFlag();
    setTimeout(() => setIsManualRefreshing(false), 1000);
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setCurrentPage("task-details");
  };

  const handleTaskDetailsBack = () => {
    setSelectedTask(null);
    setCurrentPage("tasks");
  };

  const handleTaskUpdate = () => {
    refreshTasks();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout error:", error);
      setError("Çıkış yaparken hata oluştu");
    }
  };

  const toggleDriverStatus = async (newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active: newStatus })
        .eq("user_id", profile.id);

      if (error) throw error;
      setIsDriverActive(newStatus);
      
      // Request location permission when activating
      if (newStatus && isLocationSupported && permissionStatus !== 'granted') {
        await requestPermission();
      }
    } catch (error) {
      console.error("Error updating driver status:", error);
      setError("Şoför durumu güncellenirken hata oluştu");
    }
  };

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

  if (loading && currentPage === "dashboard") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute animate-pulse">
              <MapPin className="h-12 w-12 text-red-500" />
            </div>
            <div className="relative animate-[moveCar_2s_ease-in-out_infinite]">
              <Car className="h-8 w-8 text-blue-600 transform rotate-45" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-800">Şoför Paneli Yükleniyor...</p>
          <p className="text-sm text-gray-500 animate-pulse">Lütfen bekleyin...</p>
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
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Real-time Status Bar */}
      {(hasNewTasks || hasTaskUpdates || !isConnected || locationError) && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              {!isConnected && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <WifiOff className="h-3 w-3" />
                  <span>Bağlantı Kesildi</span>
                </Badge>
              )}
              {isConnected && (
                <Badge variant="default" className="flex items-center space-x-1 bg-green-500">
                  <Wifi className="h-3 w-3" />
                  <span>Canlı</span>
                </Badge>
              )}
              {hasNewTasks && (
                <Badge variant="default" className="animate-pulse bg-blue-500">
                  Yeni Görevler Var
                </Badge>
              )}
              {hasTaskUpdates && (
                <Badge variant="default" className="animate-pulse bg-orange-500">
                  Görevler Güncellendi
                </Badge>
              )}
              {locationError && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Konum Hatası</span>
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {lastUpdateTime && (
                <span className="text-xs text-gray-500">
                  Son güncelleme: {lastUpdateTime.toLocaleTimeString('tr-TR')}
                </span>
              )}
              <Button
                onClick={handleManualRefresh}
                variant="outline"
                size="sm"
                disabled={isManualRefreshing}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isDriverActive={isDriverActive}
        toggleDriverStatus={toggleDriverStatus}
        profile={profile}
        loading={loading}
        refreshTasks={handleManualRefresh}
        handleLogout={handleLogout}
        hasNewTasks={hasNewTasks}
        hasTaskUpdates={hasTaskUpdates}
        isLocationTracking={isTracking}
        locationPermission={permissionStatus}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentPage === "task-details" && selectedTask ? (
          <TaskDetails
            task={selectedTask}
            onBack={handleTaskDetailsBack}
            onTaskUpdate={handleTaskUpdate}
            profile={profile}
          />
        ) : (
          <>
            {currentPage === "dashboard" && (
              <DashboardPage
                tasks={tasks}
                locations={locations}
                routes={routes}
                setCurrentPage={setCurrentPage}
                getStatusCount={getStatusCount}
                profile={profile}
                driver={driver}
                hasNewTasks={hasNewTasks}
                hasTaskUpdates={hasTaskUpdates}
                lastRefreshTime={lastRefreshTime}
                currentLocation={location}
                isLocationTracking={isTracking}
              />
            )}
            {currentPage === "tasks" && (
              <TasksPage
                tasks={tasks}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                getStatusColor={getStatusColor}
                onTaskClick={handleTaskClick}
              />
            )}
            {currentPage === "map" && (
              <MapPage
                locations={locations}
                setLocations={setLocations}
                profile={profile}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
              />
            )}
            {currentPage === "routes" && (
              <RoutesPage
                routes={routes}
                setRoutes={setRoutes}
                profile={profile}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
              />
            )}
            {currentPage === "translation" && (
              <TranslationPage
                translationText={translationText}
                setTranslationText={setTranslationText}
                translatedText={translatedText}
                setTranslatedText={setTranslatedText}
                sourceLang={sourceLang}
                setSourceLang={setSourceLang}
                targetLang={targetLang}
                setTargetLang={setTargetLang}
                isTranslating={isTranslating}
                setIsTranslating={setIsTranslating}
                setError={setError}
              />
            )}
            {currentPage === "ratings" && (
              <RatingsPage
                profile={profile}
                driver={driver}
                setCurrentPage={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
