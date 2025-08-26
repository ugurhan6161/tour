"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, User, Calendar, MapPin, Phone, FileText } from "lucide-react"
import TaskEditModal from "./task-edit-modal"

interface TasksTableProps {
  tasks: any[]
  drivers: any[]
  onTaskUpdate: () => void
  profile: any
}

export default function TasksTable({ tasks, drivers, onTaskUpdate, profile }: TasksTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [driverFilter, setDriverFilter] = useState("all")
  const [editingTask, setEditingTask] = useState<any>(null)
  const supabase = createClient()

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesDriver = driverFilter === "all" || task.assigned_driver_id === driverFilter

    return matchesSearch && matchesStatus && matchesDriver
  })

  const deleteTask = async (taskId: string) => {
    if (confirm("Bu görevi silmek istediğinizden emin misiniz?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (!error) {
        onTaskUpdate()
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "assigned":
        return "bg-yellow-100 text-yellow-800"
      case "in_progress":
        return "bg-orange-100 text-orange-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "Belirsiz"
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tüm Görevler</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Görev ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="new">Yeni</SelectItem>
                <SelectItem value="assigned">Atanmış</SelectItem>
                <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="cancelled">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Şöför" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Şöförler</SelectItem>
                <SelectItem value="none">Atanmamış</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Görev</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tarih & Saat</TableHead>
                  <TableHead>Güzergah</TableHead>
                  <TableHead>Şöför</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-500">ID: {task.id.slice(0, 8)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{task.customer_name}</p>
                          <p className="text-sm text-gray-500 flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{task.customer_phone}</span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{formatDate(task.pickup_date)}</p>
                          <p className="text-sm text-gray-500">{formatTime(task.pickup_time)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-green-600" />
                          <p className="text-sm truncate max-w-32">{task.pickup_location}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-red-600" />
                          <p className="text-sm truncate max-w-32">{task.dropoff_location}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.driver_name ? (
                        <div>
                          <p className="font-medium">{task.driver_name}</p>
                          <p className="text-sm text-gray-500">{task.vehicle_plate}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Atanmamış</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(task.status)} text-xs`}>
                        {task.status === "new" && "YENİ"}
                        {task.status === "assigned" && "ATANMIŞ"}
                        {task.status === "in_progress" && "DEVAM EDİYOR"}
                        {task.status === "completed" && "TAMAMLANDI"}
                        {task.status === "cancelled" && "İPTAL EDİLDİ"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setEditingTask(task)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          title="Görevi düzenle ve dosyaları yönet"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteTask(task.id)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Kriterlere uygun görev bulunamadı.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          drivers={drivers}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null)
            onTaskUpdate()
          }}
        />
      )}
    </>
  )
}
