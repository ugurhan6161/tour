"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, User, Calendar, MapPin, Phone, FileText, Search, Filter, ChevronDown, ChevronUp, Edit, Upload, ArrowRightLeft, MessageCircle } from "lucide-react";
import TaskEditModal from "./task-edit-modal";
import FilesModal from "./files-modal";
import DriverTransferModal from "./driver-transfer-modal";
import CommunicationModal from "./communication-modal";

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
  const [dateFilter, setDateFilter] = useState("all");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [filesTask, setFilesTask] = useState<any>(null);
  const [transferTask, setTransferTask] = useState<any>(null);
  const [communicationTask, setCommunicationTask] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const supabase = createClient();

  // Normalize driver data structure
  const normalizeDriverData = (driver: any) => {
    // Handle different data structures based on the other components
    if (driver.drivers) {
      // From operations-dashboard structure: profile with drivers nested
      return {
        user_id: driver.id,
        full_name: driver.full_name || "Bilinmeyen Şoför",
        phone: driver.phone || "",
        vehicle_plate: driver.drivers.vehicle_plate || driver.driver_info?.vehicle_plate || "",
        license_number: driver.drivers.license_number || driver.driver_info?.license_number || "",
        is_active: driver.drivers.is_active ?? driver.driver_info?.is_active ?? false
      };
    } else if (driver.driver_info) {
      // From drivers-management structure: profile with driver_info nested
      return {
        user_id: driver.id,
        full_name: driver.full_name || "Bilinmeyen Şoför",
        phone: driver.phone || "",
        vehicle_plate: driver.driver_info.vehicle_plate || "",
        license_number: driver.driver_info.license_number || "",
        is_active: driver.driver_info.is_active ?? false
      };
    } else {
      // Direct driver structure or fallback
      return {
        user_id: driver.id || driver.user_id,
        full_name: driver.full_name || "Bilinmeyen Şoför",
        phone: driver.phone || "",
        vehicle_plate: driver.vehicle_plate || "",
        license_number: driver.license_number || "",
        is_active: driver.is_active ?? false
      };
    }
  };

  // Normalize drivers data
  const normalizedDrivers = drivers.map(normalizeDriverData);

  // Find driver info for a task
  const getDriverInfo = (task: any) => {
    if (!task.assigned_driver_id) return null;
    return normalizedDrivers.find(driver => driver.user_id === task.assigned_driver_id) || null;
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      (task.customer_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (task.pickup_location?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (task.dropoff_location?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (task.title?.toLowerCase() || "").includes(searchQuery.toLowerCase());

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

  return (
    <>
      <div className="space-y-6">
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-bold text-gray-900">Görevler</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="border-gray-300"
                >
                  {showFilters ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Filtreleri Gizle
                    </>
                  ) : (
                    <>
                      <Filter className="h-4 w-4 mr-2" />
                      Filtreleri Göster
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Arama</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Müşteri, lokasyon veya başlık ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Durum</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="new">Yeni</SelectItem>
                      <SelectItem value="assigned">Atanmış</SelectItem>
                      <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="driver">Şoför</Label>
                  <Select value={driverFilter} onValueChange={setDriverFilter}>
                    <SelectTrigger id="driver" className="mt-1">
                      <SelectValue placeholder="Şoför seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {normalizedDrivers.filter(d => d.is_active).map((driver) => (
                        <SelectItem key={driver.user_id} value={driver.user_id}>
                          {driver.full_name} ({driver.vehicle_plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Tarih</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger id="date" className="mt-1">
                      <SelectValue placeholder="Tarih seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="today">Bugün</SelectItem>
                      <SelectItem value="yesterday">Dün</SelectItem>
                      <SelectItem value="last7days">Son 7 Gün</SelectItem>
                      <SelectItem value="last30days">Son 30 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}

          <CardContent>
            <div className="space-y-6">
              <Table className="hidden lg:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Görev</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Güzergah</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Şoför</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const driverInfo = getDriverInfo(task);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{task.customer_name}</span>
                            {task.customer_phone && (
                              <span className="text-xs text-gray-600">{task.customer_phone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>{task.pickup_location} → {task.dropoff_location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{new Date(task.pickup_date).toLocaleDateString('tr-TR')}</span>
                            {task.pickup_time && (
                              <span className="text-xs text-gray-600">
                                {new Date(`2000-01-01T${task.pickup_time}`).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === 'completed' ? 'success' :
                              task.status === 'cancelled' ? 'destructive' :
                              task.status === 'in_progress' ? 'warning' :
                              'default'
                            }
                          >
                            {task.status === 'new' ? 'Yeni' :
                             task.status === 'assigned' ? 'Atanmış' :
                             task.status === 'in_progress' ? 'Devam Ediyor' :
                             task.status === 'completed' ? 'Tamamlandı' :
                             task.status === 'cancelled' ? 'İptal Edildi' : 'Bilinmeyen'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {driverInfo ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{driverInfo.full_name}</span>
                              <span className="text-xs text-gray-600">{driverInfo.vehicle_plate}</span>
                            </div>
                          ) : (
                            <span className="text-gray-600">Atanmamış</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => setEditingTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setFilesTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setTransferTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setCommunicationTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:hidden">
                {filteredTasks.map((task) => {
                  const driverInfo = getDriverInfo(task);
                  return (
                    <Card key={task.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">{task.title}</h4>
                            <Badge
                              variant={
                                task.status === 'completed' ? 'success' :
                                task.status === 'cancelled' ? 'destructive' :
                                task.status === 'in_progress' ? 'warning' :
                                'default'
                              }
                              className="text-xs"
                            >
                              {task.status === 'new' ? 'Yeni' :
                               task.status === 'assigned' ? 'Atanmış' :
                               task.status === 'in_progress' ? 'Devam Ediyor' :
                               task.status === 'completed' ? 'Tamamlandı' :
                               task.status === 'cancelled' ? 'İptal Edildi' : 'Bilinmeyen'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                            <User className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-xs truncate">{task.customer_name || "Bilinmeyen Müşteri"}</p>
                              {task.customer_phone && (
                                <p className="text-xs text-gray-600 mt-0.5 truncate">{task.customer_phone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                            <MapPin className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-600 truncate">{task.pickup_location || "Bilinmeyen"} → {task.dropoff_location || "Bilinmeyen"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md">
                            <Calendar className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-600">
                                {new Date(task.pickup_date).toLocaleDateString('tr-TR')}
                                {task.pickup_time && (
                                  <span className="ml-1">
                                    {new Date(`2000-01-01T${task.pickup_time}`).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                            <User className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              {driverInfo ? (
                                <>
                                  <p className="font-medium text-gray-900 text-xs truncate">{driverInfo.full_name}</p>
                                  <p className="text-xs text-gray-600 mt-0.5 truncate">{driverInfo.vehicle_plate}</p>
                                </>
                              ) : (
                                <span className="text-gray-600 text-xs font-medium">Atanmamış</span>
                              )}
                            </div>
                            <Button
                              onClick={() => setTransferTask(task)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100"
                              title="Şoför değiştir"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              onClick={() => setEditingTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setFilesTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setCommunicationTask(task)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          drivers={normalizedDrivers}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null);
            onTaskUpdate();
          }}
        />
      )}

      {filesTask && (
        <FilesModal
          task={filesTask}
          onClose={() => setFilesTask(null)}
        />
      )}

      {transferTask && (
        <DriverTransferModal
          task={transferTask}
          drivers={normalizedDrivers}
          onClose={() => setTransferTask(null)}
          onSuccess={() => {
            setTransferTask(null);
            onTaskUpdate();
          }}
        />
      )}

      {communicationTask && (
        <CommunicationModal
          task={communicationTask}
          onClose={() => setCommunicationTask(null)}
        />
      )}
    </>
  );
}
