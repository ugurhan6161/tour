"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, MapPin, Calendar, Clock, Phone, User, FileText, Camera, AlertTriangle, Car } from "lucide-react"
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
        return { text: "Yeni", className: "bg-blue-50 text-blue-700 border-blue-200" }
      case "assigned":
        return { text: "Atandı", className: "bg-amber-50 text-amber-700 border-amber-200" }
      case "in_progress":
        return { text: "Devam Ediyor", className: "bg-orange-50 text-orange-700 border-orange-200" }
      case "completed":
        return { text: "Tamamlandı", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      case "cancelled":
        return { text: "İptal Edildi", className: "bg-red-50 text-red-700 border-red-200" }
      default:
        return { text: "Bilinmeyen", className: "bg-gray-50 text-gray-700 border-gray-200" }
    }
  }

  const canStartTask = task.status === "assigned"
  const canCompleteTask = task.status === "in_progress"
  const canReportIssue = ["assigned", "in_progress"].includes(task.status)
  const statusInfo = getStatusInfo(task.status)

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center space-x-2 text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-medium">Görevlere Dön</span>
              </Button>
            </div>
            <Badge className={`${statusInfo.className} border font-medium px-3 py-1`}>{statusInfo.text}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8 shadow-sm border-border">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center space-x-3">
              <Car className="h-6 w-6 text-primary" />
              <span>{task.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tarih</p>
                    <p className="font-semibold text-foreground">{formatDate(task.pickup_date)}</p>
                  </div>
                </div>

                {task.pickup_time && (
                  <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-secondary/10 rounded-full">
                      <Clock className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Saat</p>
                      <p className="font-semibold text-foreground">{formatTime(task.pickup_time)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-accent/10 rounded-full">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Müşteri</p>
                    <p className="font-semibold text-foreground">{task.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Phone className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefon</p>
                    <p className="font-semibold text-foreground">{task.customer_phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-xl">
              <MapPin className="h-6 w-6 text-primary" />
              <span>Güzergah Detayları</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                <div className="p-3 bg-emerald-500 rounded-full">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-800 mb-1">Alış Konumu</p>
                  <p className="text-emerald-700 leading-relaxed">{task.pickup_location}</p>
                </div>
              </div>

              <div className="flex justify-center my-4">
                <div className="w-px h-8 bg-border"></div>
              </div>

              <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
                <div className="p-3 bg-red-500 rounded-full">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800 mb-1">Bırakış Konumu</p>
                  <p className="text-red-700 leading-relaxed">{task.dropoff_location}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Notes */}
        {task.customer_notes && (
          <Card className="mb-8 shadow-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-xl">
                <FileText className="h-6 w-6 text-primary" />
                <span>Müşteri Notları</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-muted/50 rounded-xl border border-border">
                <p className="text-foreground leading-relaxed">{task.customer_notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-xl">
              <Camera className="h-6 w-6 text-primary" />
              <span>Müşteri Belgeleri</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload taskId={task.id} profileId={profile.id} />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-8">
            <div className="flex flex-col space-y-4">
              {canStartTask && (
                <Button
                  onClick={handleStartTask}
                  disabled={isUpdating}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg"
                >
                  {isUpdating ? "Başlatılıyor..." : "Görevi Başlat"}
                </Button>
              )}

              {canCompleteTask && (
                <Button
                  onClick={handleCompleteTask}
                  disabled={isUpdating}
                  className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg"
                >
                  {isUpdating ? "Tamamlanıyor..." : "Tamamlandı Olarak İşaretle"}
                </Button>
              )}

              {canReportIssue && (
                <div className="space-y-4">
                  {!showIssueForm ? (
                    <Button
                      onClick={() => setShowIssueForm(true)}
                      variant="destructive"
                      className="w-full h-12 font-semibold text-lg"
                    >
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Sorun Bildir
                    </Button>
                  ) : (
                    <div className="space-y-4 p-6 bg-muted/50 rounded-xl border border-border">
                      <Textarea
                        placeholder="Sorunu detaylı olarak açıklayın..."
                        value={issueReport}
                        onChange={(e) => setIssueReport(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex space-x-3">
                        <Button
                          onClick={handleReportIssue}
                          disabled={isUpdating || !issueReport.trim()}
                          variant="destructive"
                          className="flex-1 h-11 font-semibold"
                        >
                          {isUpdating ? "Bildiriliyor..." : "Sorunu Gönder"}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowIssueForm(false)
                            setIssueReport("")
                          }}
                          variant="outline"
                          className="flex-1 h-11 font-semibold"
                        >
                          İptal
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
