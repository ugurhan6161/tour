// components/Header.tsx
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, RefreshCw, ArrowLeft, CheckCircle, XCircle, Bus } from "lucide-react";

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isDriverActive: boolean;
  toggleDriverStatus: (newStatus: boolean) => void;
  profile: any;
  loading: boolean;
  refreshTasks: () => void;
  handleLogout: () => void;
}

export default function Header({
  currentPage,
  setCurrentPage,
  isDriverActive,
  toggleDriverStatus,
  profile,
  loading,
  refreshTasks,
  handleLogout
}: HeaderProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center space-x-1">
            <div className="flex items-center space-x-4">
              {currentPage !== "dashboard" && (
                <Button
                  onClick={() => setCurrentPage("dashboard")}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-blue-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              {/* Başlık ve şoför bilgileri - her zaman göster */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <Bus className="h-5 w-5 text-blue-600" />
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                    Tur Şoför Paneli
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  Hoş geldiniz, {profile?.full_name || "Şoför"}
                </p>
              </div>
            </div>
            
            {/* Aktiflik toggle - sadece dashboard sayfasında göster */}
            {currentPage === "dashboard" && (
              <div className="flex items-center bg-white/20 rounded-xl p-2 backdrop-blur-sm space-x-px">
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
            )}
            
            {/* Yenileme butonu - dashboard hariç diğer sayfalarda göster */}
            {currentPage !== "dashboard" && (
              <Button
                onClick={refreshTasks}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex items-center space-x-1 sm:space-x-2 hover:bg-blue-50 border-blue-200"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:block">Yenile</span>
              </Button>
            )}
            
            {/* Çıkış butonu - sadece dashboard sayfasında göster */}
            {currentPage === "dashboard" && (
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex items-center space-x-1 sm:space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block ml-0 sm:ml-2">Çıkış</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
