// components/DashboardPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Map, Route, Languages, Home, User, Phone, Car, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DashboardPageProps {
  tasks: any[];
  locations: any[];
  routes: any[];
  setCurrentPage: (page: string) => void;
  getStatusCount: (status: string) => number;
  profile: any;
  driver: any;
}

export default function DashboardPage({
  tasks,
  locations,
  routes,
  setCurrentPage,
  getStatusCount,
  profile,
  driver
}: DashboardPageProps) {
  const [isDriverInfoExpanded, setIsDriverInfoExpanded] = useState(false);

  return (
    <div className="space-y-6">
      {/* Driver Status Card with Collapsible Content */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden p-3 sm:p-4">
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
              }}
            ></div>
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
                <div className="text-base sm:text-lg font-bold">Şoför Durumu</div>
                <div className="text-sm opacity-90">
                  {driver?.is_active ? "🟢 Aktif" : "🔴 Pasif"}
                </div>
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
                    <p className="font-bold text-slate-800 text-sm truncate">{profile?.full_name || "Belirtilmemiş"}</p>
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
                      {profile?.phone || "Belirtilmemiş"}
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

      {/* Navigation Buttons - Modern Design */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-gray-600" />
            <span className="text-base font-bold text-gray-800">Ana Menü</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              onClick={() => setCurrentPage("tasks")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Calendar className="h-6 w-6" />
              <span className="font-medium">Görevler</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {tasks.length}
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("map")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Map className="h-6 w-6" />
              <span className="font-medium">Harita</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {locations.length}
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("routes")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Route className="h-6 w-6" />
              <span className="font-medium">Tur Rotaları</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {routes.length}
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("translation")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Languages className="h-6 w-6" />
              <span className="font-medium">Dil Çeviri</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                TR/EN
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
