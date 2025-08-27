"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  FileText, 
  Camera, 
  AlertTriangle, 
  Bus,
  Navigation,
  Users,
  CheckCircle,
  PlayCircle,
  XCircle,
  MessageSquare
} from "lucide-react"
import FileUpload from "./file-upload"

interface TaskDetailsProps {
  task: any
  onBack: () => void
  onTaskUpdate: () => void
  profile: any
}

export default function TaskDetails({ task, onBack, onTaskUpdate, profile }: TaskDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [issueReport, setIssueReport] = useState("")
  const [showIssueForm, setShowIssueForm] = useState(false)
  const supabase = createClient()

  const updateTaskStatus = async (newStatus: string, notes?: string) => {
    setIsUpdating(true)
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (notes) {
        updateData.customer_notes = notes
      }

      const { error } = await supabase.from("tasks").update(updateData).eq("id", task.id)

      if (error) throw error

      onTaskUpdate()
      onBack()
    } catch (error) {
      console.error("Error updating task:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStartTask = () => {
    updateTaskStatus("in_progress")
  }

  const handleCompleteTask = () => {
    updateTaskStatus("completed")
  }

  const handleReportIssue = () => {
    if (issueReport.trim()) {
      updateTaskStatus("cancelled", `Issue reported: ${issueReport}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "Saat Belirsiz"
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "new":
        return { 
          text: "Yeni Transfer", 
          className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
          icon: <PlayCircle className="h-4 w-4" />
        }
      case "assigned":
        return { 
          text: "Atanmış", 
          className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg",
          icon: <Users className="h-4 w-4" />
        }
      case "in_progress":
        return { 
          text: "Aktif Transfer", 
          className: "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg animate-pulse",
          icon: <Navigation className="h-4 w-4" />
        }
      case "completed":
        return { 
          text: "Tamamlandı", 
          className: "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg",
          icon: <CheckCircle className="h-4 w-4" />
        }
      case "cancelled":
        return { 
          text: "İptal Edildi", 
          className: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg",
          icon: <XCircle className="h-4 w-4" />
        }
      default:
        return { 
          text: "Bilinmeyen", 
          className: "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg",
          icon: <AlertTriangle className="h-4 w-4" />
        }
    }
  }

  const canStartTask = task.status === "assigned"
  const canCompleteTask = task.status === "in_progress"
  const canReportIssue = ["assigned", "in_progress"].includes(task.status)
  const statusInfo = getStatusInfo(task.status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="lg"
                onClick={onBack}
                className="flex items-center space-x-3 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-300 rounded-xl px-4 py-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-semibold">Transfer Listesi</span>
              </Button>
              
              <div className="hidden sm:flex items-center space-x-2 text-slate-600">
                <Bus className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Tur Transfer Yönetimi</span>
              </div>
            </div>
            
            <Badge className={`${statusInfo.className} px-4 py-2 rounded-full font-semibold text-sm flex items-center space-x-2`}>
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Compact Main Transfer Card - Mobile Optimized */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden p-4 sm:p-6">
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}></div>
            </div>
            <CardTitle className="text-lg sm:text-3xl font-bold flex items-center space-x-3 relative z-10">
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Bus className="h-5 w-5 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">Transfer Görevi</div>
                <div className="truncate">{task.title}</div>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-8">
            {/* Mobile: Compact 2x2 grid, Desktop: 4 columns */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              {/* Date Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-blue-100">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 sm:p-3 bg-blue-500 rounded-lg sm:rounded-xl shadow-lg mb-2 sm:mb-4">
                    <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-blue-600 mb-1 sm:mb-2">Tarih</p>
                  <p className="font-bold text-slate-800 text-xs sm:text-lg leading-tight text-center">
                    {new Date(task.pickup_date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short"
                    })}
                  </p>
                </div>
              </div>

              {/* Time Info */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-emerald-100">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 sm:p-3 bg-emerald-500 rounded-lg sm:rounded-xl shadow-lg mb-2 sm:mb-4">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-emerald-600 mb-1 sm:mb-2">Saat</p>
                  <p className="font-bold text-slate-800 text-sm sm:text-xl">
                    {task.pickup_time ? formatTime(task.pickup_time) : "--:--"}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-purple-100">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 sm:p-3 bg-purple-500 rounded-lg sm:rounded-xl shadow-lg mb-2 sm:mb-4">
                    <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-purple-600 mb-1 sm:mb-2">Müşteri</p>
                  <p className="font-bold text-slate-800 text-xs sm:text-lg leading-tight text-center truncate w-full">
                    {task.customer_name}
                  </p>
                </div>
              </div>

              {/* Phone Info */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-orange-100">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 sm:p-3 bg-orange-500 rounded-lg sm:rounded-xl shadow-lg mb-2 sm:mb-4">
                    <Phone className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-orange-600 mb-1 sm:mb-2">İletişim</p>
                  <p className="font-bold text-slate-800 text-xs sm:text-lg truncate w-full">
                    {task.customer_phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Route Section - Integrated */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="p-1.5 sm:p-2 bg-emerald-500 rounded-lg">
                  <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">Transfer Güzergahı</h3>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Compact Pickup */}
                <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                  <div className="p-2 sm:p-3 bg-emerald-500 rounded-lg shadow-lg flex-shrink-0">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">BAŞLANGIÇ</span>
                    </div>
                    <p className="text-emerald-700 text-sm sm:text-base font-medium leading-snug">{task.pickup_location}</p>
                  </div>
                </div>

                {/* Mobile Route Connector */}
                

                {/* Compact Dropoff */}
                <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
                  <div className="p-2 sm:p-3 bg-red-500 rounded-lg shadow-lg flex-shrink-0">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-red-500 text-white text-xs font-bold rounded-full">VARLIŞ</span>
                    </div>
                    <p className="text-red-700 text-sm sm:text-base font-medium leading-snug">{task.dropoff_location}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Customer Notes - Only if exists */}
        {task.customer_notes && (
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 mb-3">
                <MessageSquare className="h-5 w-5 text-violet-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Müşteri Notları</h3>
              </div>
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-200">
                <p className="text-slate-800 text-sm sm:text-base leading-relaxed">{task.customer_notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compact File Upload */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-3">
              <Camera className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Transfer Belgeleri</h3>
            </div>
            <FileUpload taskId={task.id} profileId={profile.id} />
          </CardContent>
        </Card>

        {/* Compact Action Buttons */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {canStartTask && (
                <Button
                  onClick={handleStartTask}
                  disabled={isUpdating}
                  className="w-full h-12 sm:h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-base sm:text-xl rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                    <PlayCircle className="h-5 w-5 sm:h-7 sm:w-7" />
                    <span>{isUpdating ? "Başlatılıyor..." : "🚌 Transfer Başlat"}</span>
                  </div>
                </Button>
              )}

              {canCompleteTask && (
                <Button
                  onClick={handleCompleteTask}
                  disabled={isUpdating}
                  className="w-full h-12 sm:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base sm:text-xl rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                    <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7" />
                    <span>{isUpdating ? "Tamamlanıyor..." : "✅ Transfer Tamamlandı"}</span>
                  </div>
                </Button>
              )}

              {canReportIssue && (
                <div className="space-y-3 sm:space-y-4">
                  {!showIssueForm ? (
                    <Button
                      onClick={() => setShowIssueForm(true)}
                      variant="destructive"
                      className="w-full h-12 sm:h-16 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 font-bold text-base sm:text-xl rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                        <AlertTriangle className="h-5 w-5 sm:h-7 sm:w-7" />
                        <span>⚠️ Sorun Bildir</span>
                      </div>
                    </Button>
                  ) : (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 sm:p-6 rounded-xl border-2 border-red-200 space-y-4">
                      <div className="text-center">
                        <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500 mx-auto mb-2" />
                        <h3 className="text-base sm:text-lg font-bold text-red-800 mb-1">Transfer Sorunu</h3>
                        <p className="text-sm text-red-600">Sorunu detaylı açıklayın</p>
                      </div>
                      
                      <Textarea
                        placeholder="Sorunu açıklayınız..."
                        value={issueReport}
                        onChange={(e) => setIssueReport(e.target.value)}
                        rows={3}
                        className="resize-none text-sm sm:text-base p-3 rounded-xl border-2 border-red-200 focus:border-red-400"
                      />
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <Button
                          onClick={handleReportIssue}
                          disabled={isUpdating || !issueReport.trim()}
                          variant="destructive"
                          className="flex-1 h-11 font-bold text-sm sm:text-base rounded-xl shadow-lg"
                        >
                          {isUpdating ? "Bildiriliyor..." : "🚨 Gönder"}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowIssueForm(false)
                            setIssueReport("")
                          }}
                          variant="outline"
                          className="flex-1 h-11 font-bold text-sm sm:text-base rounded-xl border-2"
                        >
                          ❌ İptal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
