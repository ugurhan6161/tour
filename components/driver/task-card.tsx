"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Phone, Clock, User, Navigation, ChevronRight } from "lucide-react";

interface TaskCardProps {
  task: any;
  onClick: () => void;
  getStatusColor: (status: string) => string;
}

export default function TaskCard({ task, onClick, getStatusColor }: TaskCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "Saat Belirsiz";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "🆕 Yeni";
      case "assigned":
        return "⏳ Atanmış";
      case "in_progress":
        return "🚌 Aktif";
      case "completed":
        return "✅ Tamamlandı";
      case "cancelled":
        return "❌ İptal";
      default:
        return "❓ Bilinmeyen";
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:scale-102 transition-all duration-200 border-0 bg-white/95 backdrop-blur-sm rounded-lg overflow-hidden group"
      onClick={onClick}
    >
      <CardContent className="p-3 relative">
        {/* Status Indicator Line */}
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${getStatusColor(task.status)}`}
        ></div>

        {/* Main Content */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Section: Title, Status, Date */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-blue-500 rounded-md">
                <Navigation className="h-3 w-3 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm truncate">{task.title}</h3>
            </div>
            <Badge className={`${getStatusColor(task.status)} rounded-full px-2 py-0.5 text-xs font-medium`}>
              {getStatusText(task.status)}
            </Badge>
            <div className="flex items-center gap-1.5 text-gray-600 mt-1">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">{formatDate(task.pickup_date)}</span>
              {task.pickup_time && (
                <>
                  <Clock className="h-3 w-3 ml-2" />
                  <span className="text-xs">{formatTime(task.pickup_time)}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Section: Route and Customer */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-emerald-500 rounded-md">
                <MapPin className="h-3 w-3 text-white" />
              </div>
              <p className="text-xs text-gray-600 truncate">{task.pickup_location}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-red-500 rounded-md">
                <MapPin className="h-3 w-3 text-white" />
              </div>
              <p className="text-xs text-gray-600 truncate">{task.dropoff_location}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-500 rounded-md">
                <User className="h-3 w-3 text-white" />
              </div>
              <p className="text-xs font-medium text-gray-900 truncate">{task.customer_name}</p>
              <Phone className="h-3 w-3 text-gray-500" />
              <p className="text-xs text-gray-600 truncate">{task.customer_phone}</p>
            </div>
          </div>

          {/* Chevron */}
          <div className="flex items-center text-blue-600 group-hover:text-blue-700 transition-colors">
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"></div>
      </CardContent>
    </Card>
  );
}
