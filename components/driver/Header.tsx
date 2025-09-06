// components/Header.tsx
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, RefreshCw, ArrowLeft, CheckCircle, XCircle, Bus, MapPin, Clock, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isDriverActive: boolean;
  toggleDriverStatus: (newStatus: boolean) => void;
  profile: any;
  loading: boolean;
  refreshTasks: () => void;
  handleLogout: () => void;
  hasNewTasks?: boolean;
  hasTaskUpdates?: boolean;
  isLocationTracking?: boolean;
  locationPermission?: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export default function Header({
  currentPage,
  setCurrentPage,
  isDriverActive,
  toggleDriverStatus,
  profile,
  loading,
  refreshTasks,
  handleLogout,
  hasNewTasks = false,
  hasTaskUpdates = false,
  isLocationTracking = false,
  locationPermission = 'unknown'
}: HeaderProps) {
  const supabase = createClient();

  // Sayfa başlıklarını belirleme
  const getPageTitle = () => {
    switch (currentPage) {
      case "tasks":
        return "Görevler";
      case "map":
        return "Harita ve Konumlar";
      case "routes":
        return "Tur Rotaları";
      default:
        return "Tur Şoför Paneli";
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Sol taraf: Geri butonu ve başlık */}
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {currentPage !== "dashboard" && (
                <Button
                  onClick={() => setCurrentPage("dashboard")}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-blue-50 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-2">
                  <Bus className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                    {getPageTitle()}
                  </h1>
                </div>
                {currentPage === "dashboard" && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Hoş geldiniz, {profile?.full_name || "Şoför"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Orta kısım: Aktiflik durumu ve real-time indikatörler */}
          {currentPage === "dashboard" && (
            <div className="hidden sm:flex items-center space-x-4 flex-shrink-0">
              {/* Driver Status */}
              <div className="flex items-center bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                {isDriverActive ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                )}
                <Switch
                  checked={isDriverActive}
                  onCheckedChange={toggleDriverStatus}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                />
              </div>
              
              {/* Real-time Status Indicators */}
              <div className="flex items-center space-x-2">
                {/* Location Tracking Status */}
                {isDriverActive && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isLocationTracking ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    <MapPin className="h-3 w-3" />
                    <span>{isLocationTracking ? 'Konum Aktif' : 'Konum Bekliyor'}</span>
                  </div>
                )}
                
                {/* New Tasks Indicator */}
                {hasNewTasks && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    <span>Yeni Görev</span>
                  </div>
                )}
                
                {/* Task Updates Indicator */}
                {hasTaskUpdates && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
                    <Clock className="h-3 w-3" />
                    <span>Güncelleme</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sağ taraf: Butonlar */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">

            {/* Yenileme butonu - dashboard hariç diğer sayfalarda göster */}
            {currentPage !== "dashboard" && (
              <Button
                onClick={refreshTasks}
                variant="outline"
                size="sm"
                disabled={loading}
                className="hover:bg-blue-50 border-blue-200 ml-2 sm:ml-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:block ml-2">Yenile</span>
              </Button>
            )}
            
            {/* Çıkış butonu - sadece dashboard sayfasında göster */}
            {currentPage === "dashboard" && (
              <>
                {/* Mobilde gösterilecek aktiflik durumu ve indikatörler */}
                <div className="sm:hidden flex items-center space-x-2">
                  <div className="flex items-center bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                    {isDriverActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Switch
                      checked={isDriverActive}
                      onCheckedChange={toggleDriverStatus}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500 ml-2"
                    />
                  </div>
                  
                  {/* Mobile indicators */}
                  {(hasNewTasks || hasTaskUpdates) && (
                    <div className="flex items-center space-x-1">
                      {hasNewTasks && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                      {hasTaskUpdates && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:block ml-2">Çıkış</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
