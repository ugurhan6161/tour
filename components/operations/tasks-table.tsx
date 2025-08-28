"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, User, Calendar, MapPin, Phone, FileText, Search, Filter } from "lucide-react";
import TaskEditModal from "./task-edit-modal";

interface TasksTableProps {
  tasks: any[];
  drivers: any[];
  onTaskUpdate: () => void;
  profile: any;
}

export default function TasksTable({ tasks, drivers, onTaskUpdate, profile }: TasksTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // New date filter state
  const [editingTask, setEditingTask] = useState<any>(null);
  const supabase = createClient();

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesDriver = driverFilter === "all" || task.assigned_driver_id === driverFilter;

    // Date filter logic
    const today = new Date();
    const taskDate = new Date(task.pickup_date);
    let matchesDate = true;

    if (dateFilter === "today") {
      matchesDate = task.pickup_date === today.toISOString().split("T")[0];
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      matchesDate = task.pickup_date === yesterday.toISOString().split("T")[0];
    } else if (dateFilter === "last7days") {
      const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = taskDate >= last7Days && taskDate <= today;
    } else if (dateFilter === "last30days") {
      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = taskDate >= last30Days && taskDate <= today;
    }

    return matchesSearch && matchesStatus && matchesDriver && matchesDate;
  });

  const deleteTask = async (taskId: string) => {
    if (confirm("Bu görevi silmek istediğinizden emin misiniz?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (!error) {
        onTaskUpdate();
      } else {
        console.error("[TasksTable] Error deleting task:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      case "assigned":
        return "bg-gradient-to-r from-yellow-500 to-amber-500 text-white";
      case "in_progress":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white";
      case "completed":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
      case "cancelled":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "YENİ";
      case "assigned": return "ATANMIŞ";
      case "in_progress": return "DEVAM EDİYOR";
      case "completed": return "TAMAMLANDI";
      case "cancelled": return "İPTAL EDİLDİ";
      default: return status.toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "Belirsiz";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b p-4">
            <CardTitle className="flex items-center space-x-2 text-gray-800 mb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <span>Tüm Görevler ({filteredTasks.length})</span>
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Görev ara..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg border-2 border-gray-200 focus:border-blue-400 bg-white/80"
                />
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 rounded-lg border-2 border-gray-200 bg-white/80">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="new">Yeni</SelectItem>
                    <SelectItem value="assigned">Atanmış</SelectItem>
                    <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Driver Filter */}
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger className="w-full sm:w-40 rounded-lg border-2 border-gray-200 bg-white/80">
                  <SelectValue placeholder="Şoför" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">Tüm Şoförler</SelectItem>
                  <SelectItem value="none">Atanmamış</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Date Filter */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-40 rounded-lg border-2 border-gray-200 bg-white/80">
                    <SelectValue placeholder="Tarih" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all">Tüm Tarihler</SelectItem>
                    <SelectItem value="today">Bugün</SelectItem>
                    <SelectItem value="yesterday">Dün</SelectItem>
                    <SelectItem value="last7days">Son 7 Gün</SelectItem>
                    <SelectItem value="last30days">Son 30 Gün</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 border-b">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Görev</TableHead>
                    <TableHead className="font-semibold text-gray-700">Müşteri</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tarih & Saat</TableHead>
                    <TableHead className="font-semibold text-gray-700">Güzergah</TableHead>
                    <TableHead className="font-semibold text-gray-700">Şoför</TableHead>
                    <TableHead className="font-semibold text-gray-700">Durum</TableHead>
                    <TableHead className="font-semibold text-gray-700">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task, index) => (
                    <TableRow key={task.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <TableCell className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <p className="text-sm text-gray-500">ID: {task.id.slice(0, 8)}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{task.customer_name}</p>
                            <p className="text-sm text-gray-600 flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{task.customer_phone}</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Calendar className="h-3 w-3 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{formatDate(task.pickup_date)}</p>
                            <p className="text-sm text-gray-600">{formatTime(task.pickup_time)}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="text-sm truncate max-w-32 text-gray-700">{task.pickup_location}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <p className="text-sm truncate max-w-32 text-gray-700">{task.dropoff_location}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="p-4">
                        {task.driver_name ? (
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <User className="h-3 w-3 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{task.driver_name}</p>
                              <p className="text-sm text-gray-600">{task.vehicle_plate}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <User className="h-3 w-3 text-gray-400" />
                            </div>
                            <span className="text-gray-400 font-medium">Atanmamış</span>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell className="p-4">
                        <Badge className={`${getStatusColor(task.status)} text-xs font-semibold px-3 py-1 rounded-full shadow-sm`}>
                          {getStatusText(task.status)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => setEditingTask(task)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                            title="Görevi düzenle ve dosyaları yönet"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deleteTask(task.id)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            title="Görevi sil"
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
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {searchQuery || statusFilter !== "all" || driverFilter !== "all" || dateFilter !== "all"
                    ? "Filtreye uygun görev bulunamadı"
                    : "Görev bulunamadı"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== "all" || driverFilter !== "all" || dateFilter !== "all"
                    ? "Farklı filtre kriterleri deneyebilirsiniz."
                    : "Henüz hiç görev oluşturulmamış."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          drivers={drivers}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null);
            onTaskUpdate();
          }}
        />
      )}
    </>
  );
}
