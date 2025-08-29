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
import TaskDetails from "./task-details";
import { AlertTriangle, Loader2, Car, MapPin } from "lucide-react";
import { Task, Location, TourRoute, DriverDashboardProps } from "./types";

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

  const [translationText, setTranslationText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("tr");
  const [targetLang, setTargetLang] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadLocations();
    loadRoutes();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
      setError("Konumlar yüklenirken hata oluştu");
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
    } catch (error) {
      console.error("Error refreshing tasks:", error);
      setError("Görevler yenilenirken hata oluştu");
    } finally {
      setLoading(false);
    }
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
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isDriverActive={isDriverActive}
        toggleDriverStatus={toggleDriverStatus}
        profile={profile}
        loading={loading}
        refreshTasks={refreshTasks}
        handleLogout={handleLogout}
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
          </>
        )}
      </div>
    </div>
  );
}
