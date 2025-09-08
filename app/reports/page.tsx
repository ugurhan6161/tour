"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { Calendar, Download, TrendingUp, Users, Car, Star, CheckCircle, Clock, FileText } from "lucide-react"

interface ReportData {
  taskStats: {
    total: number
    completed: number
    pending: number
    cancelled: number
  }
  driverStats: {
    total: number
    active: number
    inactive: number
  }
  ratingStats: {
    average: number
    total: number
    distribution: { rating: number; count: number }[]
  }
  monthlyTasks: { month: string; count: number }[]
  topDrivers: { name: string; completedTasks: number; rating: number }[]
}

interface ReportsComponentProps {
  profile: any
}

export default function ReportsComponent({ profile }: ReportsComponentProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [reportType, setReportType] = useState("overview")

  const supabase = createClient()

  const fetchReportData = async () => {
    try {
      setLoading(true)

      const startDateWithTime = `${dateRange.startDate}T00:00:00`
      const endDateWithTime = `${dateRange.endDate}T23:59:59`

      console.log("Fetching data for date range:", { startDateWithTime, endDateWithTime })

      // Task statistics - Görevler tablosundan direk veri çek
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          status,
          created_at,
          assigned_driver_id,
          title,
          customer_name
        `)
        .gte("created_at", startDateWithTime)
        .lte("created_at", endDateWithTime)

      if (tasksError) {
        console.error("Tasks query error:", tasksError)
        throw tasksError
      }

      console.log("Tasks fetched:", tasks?.length || 0)

      // Driver statistics - Şoförler tablosundan veri çek
      const { data: drivers, error: driversError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          drivers!inner (
            user_id,
            is_active,
            vehicle_plate,
            license_number
          )
        `)
        .eq("role", "driver")

      if (driversError) {
        console.error("Drivers query error:", driversError)
        throw driversError
      }

      console.log("Drivers fetched:", drivers?.length || 0)

      // Rating statistics - Müşteri değerlendirmelerini çek
      const { data: ratings, error: ratingsError } = await supabase
        .from("customer_ratings")
        .select(`
          id,
          rating,
          created_at,
          task_id,
          tasks!inner (
            id,
            assigned_driver_id,
            profiles!tasks_assigned_driver_id_fkey (
              full_name
            )
          )
        `)
        .gte("created_at", startDateWithTime)
        .lte("created_at", endDateWithTime)

      if (ratingsError) {
        console.error("Ratings query error:", ratingsError)
        // Ratings hatası olursa boş array kullan, çünkü bu tablo olmayabilir
        console.log("Ratings table might not exist, using empty array")
      }

      console.log("Ratings fetched:", ratings?.length || 0)

      // Process task statistics
      const taskStats = {
        total: tasks?.length || 0,
        completed: tasks?.filter((t) => t.status === "COMPLETED").length || 0,
        pending: tasks?.filter((t) => ["NEW", "ASSIGNED", "IN_PROGRESS"].includes(t.status)).length || 0,
        cancelled: tasks?.filter((t) => t.status === "CANCELLED").length || 0,
      }

      console.log("Task stats processed:", taskStats)

      // Process driver statistics
      const driverStats = {
        total: drivers?.length || 0,
        active: drivers?.filter((d) => d.drivers.is_active).length || 0,
        inactive: drivers?.filter((d) => !d.drivers.is_active).length || 0,
      }

      console.log("Driver stats processed:", driverStats)

      // Process rating statistics
      const validRatings = ratings?.filter(r => r.rating && typeof r.rating === 'number') || []
      const ratingStats = {
        average: validRatings.length ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length : 0,
        total: validRatings.length,
        distribution: [1, 2, 3, 4, 5].map((rating) => ({
          rating,
          count: validRatings.filter((r) => r.rating === rating).length,
        })),
      }

      console.log("Rating stats processed:", ratingStats)

      // Process monthly tasks - Son 6 ay
      const monthlyTasks = Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStr = date.toLocaleDateString("tr-TR", { month: "short", year: "numeric" })
        const count = tasks?.filter((t) => {
          const taskDate = new Date(t.created_at)
          return taskDate.getMonth() === date.getMonth() && taskDate.getFullYear() === date.getFullYear()
        }).length || 0
        return { month: monthStr, count }
      }).reverse()

      console.log("Monthly tasks processed:", monthlyTasks)

      // Process top drivers - Tamamlanan görevlere göre
      const driverTaskCounts = new Map()
      const driverRatingMap = new Map()

      // Tamamlanan görevleri say
      tasks?.forEach((task) => {
        if (task.assigned_driver_id && task.status === "COMPLETED") {
          driverTaskCounts.set(task.assigned_driver_id, (driverTaskCounts.get(task.assigned_driver_id) || 0) + 1)
        }
      })

      // Şoför puanlarını hesapla
      validRatings?.forEach((rating) => {
        const driverId = rating.tasks?.assigned_driver_id
        if (driverId) {
          const currentRatings = driverRatingMap.get(driverId) || []
          currentRatings.push(rating.rating)
          driverRatingMap.set(driverId, currentRatings)
        }
      })

      const topDrivers = Array.from(driverTaskCounts.entries())
        .map(([driverId, completedTasks]) => {
          const driver = drivers?.find((d) => d.id === driverId)
          const driverRatingsList = driverRatingMap.get(driverId) || []
          const avgRating = driverRatingsList.length
            ? driverRatingsList.reduce((sum: number, r: number) => sum + r, 0) / driverRatingsList.length
            : 0

          return {
            name: driver?.full_name || "Bilinmeyen Şoför",
            completedTasks: completedTasks as number,
            rating: avgRating,
          }
        })
        .sort((a, b) => b.completedTasks - a.completedTasks)
        .slice(0, 5)

      console.log("Top drivers processed:", topDrivers)

      const finalReportData = {
        taskStats,
        driverStats,
        ratingStats,
        monthlyTasks,
        topDrivers,
      }

      console.log("Final report data:", finalReportData)
      setReportData(finalReportData)

    } catch (error) {
      console.error("Error fetching report data:", error)
      // Hata durumunda da temel bir rapor verisi sağla
      setReportData({
        taskStats: { total: 0, completed: 0, pending: 0, cancelled: 0 },
        driverStats: { total: 0, active: 0, inactive: 0 },
        ratingStats: { average: 0, total: 0, distribution: [1, 2, 3, 4, 5].map(r => ({ rating: r, count: 0 })) },
        monthlyTasks: [],
        topDrivers: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, []) // İlk yüklenmede çalışsın

  // Tarih değiştiğinde veya manuel güncelleme yapıldığında çalışacak fonksiyon
  const handleUpdateReport = (e?: React.FormEvent) => {
    if (e) e.preventDefault() // Form submit'i engelle
    fetchReportData()
  }

  const exportReport = () => {
    if (!reportData) return

    const reportContent = {
      tarih: new Date().toLocaleDateString("tr-TR"),
      tarihAraligi: `${dateRange.startDate} - ${dateRange.endDate}`,
      gorevIstatistikleri: reportData.taskStats,
      soforIstatistikleri: reportData.driverStats,
      degerlendirmeIstatistikleri: reportData.ratingStats,
      enIyiSoforler: reportData.topDrivers,
    }

    const dataStr = JSON.stringify(reportContent, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tur-ajansi-raporu-${new Date().toISOString().split("T")[0]}.json`
    link.click()
  }

  const COLORS = ["#059669", "#10b981", "#0891b2", "#7c3aed", "#dc2626"]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Rapor verileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center space-x-2">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              <span>Raporlar</span>
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1">
              Tur ajansı faaliyet raporları ve analizleri
            </p>
          </div>

          <Button
            onClick={exportReport}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center space-x-2 h-9 sm:h-10"
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Raporu İndir</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg text-card-foreground flex items-center space-x-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Filtreler</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <form onSubmit={handleUpdateReport}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs sm:text-sm font-medium text-card-foreground">
                  Başlangıç Tarihi
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="bg-input border-border text-sm h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-xs sm:text-sm font-medium text-card-foreground">
                  Bitiş Tarihi
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="bg-input border-border text-sm h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportType" className="text-xs sm:text-sm font-medium text-card-foreground">
                  Rapor Türü
                </Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-input border-border h-9 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Genel Bakış</SelectItem>
                    <SelectItem value="tasks">Görev Analizi</SelectItem>
                    <SelectItem value="drivers">Şoför Performansı</SelectItem>
                    <SelectItem value="ratings">Müşteri Değerlendirmeleri</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleUpdateReport}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground h-9 sm:h-10 text-sm"
                >
                  Raporu Güncelle
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-primary rounded-lg flex-shrink-0">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-primary truncate">
                      {reportData.taskStats.completed}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-primary/80">Tamamlanan Görev</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-secondary/20">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-secondary rounded-lg flex-shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-secondary truncate">
                      {reportData.taskStats.pending}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-secondary/80">Bekleyen Görev</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-blue-500 rounded-lg flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-500 truncate">
                      {reportData.driverStats.active}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-blue-500/80">Aktif Şoför</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-2 sm:p-3 bg-yellow-500 rounded-lg flex-shrink-0">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-yellow-600 truncate">
                      {reportData.ratingStats.average.toFixed(1)}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-yellow-600/80">Ortalama Puan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Tasks Chart */}
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm sm:text-base lg:text-lg text-card-foreground flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Aylık Görev Trendi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="h-48 sm:h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.monthlyTasks} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Status Distribution */}
            <Card className="bg-card border-border">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm sm:text-base lg:text-lg text-card-foreground flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Görev Durumu Dağılımı</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="h-48 sm:h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Tamamlanan", value: reportData.taskStats.completed, color: COLORS[0] },
                          { name: "Bekleyen", value: reportData.taskStats.pending, color: COLORS[1] },
                          { name: "İptal Edilen", value: reportData.taskStats.cancelled, color: COLORS[4] },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {[
                          { name: "Tamamlanan", value: reportData.taskStats.completed, color: COLORS[0] },
                          { name: "Bekleyen", value: reportData.taskStats.pending, color: COLORS[1] },
                          { name: "İptal Edilen", value: reportData.taskStats.cancelled, color: COLORS[4] },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Drivers */}
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-sm sm:text-base lg:text-lg text-card-foreground flex items-center space-x-2">
                <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span>En İyi Performans Gösteren Şoförler</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                {reportData.topDrivers.length > 0 ? (
                  reportData.topDrivers.map((driver, index) => (
                    <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full font-bold text-xs sm:text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-card-foreground text-sm sm:text-base truncate">
                            {driver.name}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {driver.completedTasks} tamamlanan görev
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs sm:text-sm font-medium text-card-foreground">
                            {driver.rating.toFixed(1)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-secondary/10 text-secondary text-xs">
                          Top {index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 bg-muted rounded-full inline-block mb-3">
                      <Car className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Seçilen tarih aralığında tamamlanan görev bulunamadı.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rating Distribution */}
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-sm sm:text-base lg:text-lg text-card-foreground flex items-center space-x-2">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span>Müşteri Değerlendirme Dağılımı</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="h-48 sm:h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportData.ratingStats.distribution}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="rating"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          {reportData.taskStats.total === 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-yellow-100 rounded-full inline-block mb-3">
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Veri Bulunamadı</h3>
                <p className="text-yellow-700">
                  Seçilen tarih aralığında ({dateRange.startDate} - {dateRange.endDate}) hiçbir görev bulunamadı.
                  Lütfen tarih aralığını değiştirip tekrar deneyin.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
