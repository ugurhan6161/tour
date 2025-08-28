"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "../driver/file-upload";
import OperationsFileUpload from "./operations-file-upload";

interface TaskEditModalProps {
  task: any;
  drivers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TaskEditModal({ task, drivers, onClose, onSuccess }: TaskEditModalProps) {
  const [formData, setFormData] = useState({
    title: task.title || "",
    pickupLocation: task.pickup_location || "",
    dropoffLocation: task.dropoff_location || "",
    pickupDate: task.pickup_date || "",
    pickupTime: task.pickup_time || "",
    customerName: task.customer_name || "",
    customerPhone: task.customer_phone || "",
    customerNotes: task.customer_notes || "",
    assignedDriverId: task.assigned_driver_id || null,
    status: task.status || "new",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    console.log("[TaskEditModal] Drivers:", JSON.stringify(drivers, null, 2));
    console.log("[TaskEditModal] Active drivers:", drivers.filter((driver) => (driver.drivers || driver)?.is_active));
    console.log("[TaskEditModal] Task assigned_driver_id:", task.assigned_driver_id);
  }, [drivers, task]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updateData = {
        title: formData.title,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_notes: formData.customerNotes || null,
        assigned_driver_id: formData.assignedDriverId,
        status: formData.assignedDriverId ? "assigned" : formData.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("tasks").update(updateData).eq("id", task.id);

      if (error) throw error;

      onSuccess();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDrivers = drivers.filter((driver) => (driver.drivers || driver)?.is_active === true);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Görevi Düzenle</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Görev Detayları</TabsTrigger>
            <TabsTrigger value="files">Belgeler ve Dosyalar</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Görev Başlığı *</Label>
                  <Input
                    id="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Durum *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Yeni</SelectItem>
                      <SelectItem value="assigned">Atanmış</SelectItem>
                      <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupDate">Alış Tarihi *</Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    required
                    value={formData.pickupDate}
                    onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupTime">Alış Saati</Label>
                  <Input
                    id="pickupTime"
                    type="time"
                    value={formData.pickupTime}
                    onChange={(e) => handleInputChange("pickupTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation">Alış Konumu *</Label>
                  <Input
                    id="pickupLocation"
                    type="text"
                    required
                    value={formData.pickupLocation}
                    onChange={(e) => handleInputChange("pickupLocation", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoffLocation">Bırakış Konumu *</Label>
                  <Input
                    id="dropoffLocation"
                    type="text"
                    required
                    value={formData.dropoffLocation}
                    onChange={(e) => handleInputChange("dropoffLocation", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Müşteri Adı *</Label>
                  <Input
                    id="customerName"
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Müşteri Telefonu *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedDriverId">Atanan Şöför</Label>
                <Select
                  value={formData.assignedDriverId || "null"}
                  onValueChange={(value) => handleInputChange("assignedDriverId", value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Şöför seçin veya atanmamış bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Atanmamış</SelectItem>
                    {activeDrivers.length > 0 ? (
                      activeDrivers.map((driver) => {
                        const driverInfo = driver.drivers || driver;
                        return (
                          <SelectItem key={driverInfo.user_id} value={driverInfo.user_id}>
                            {driver.full_name || "İsim Yok"} - {driverInfo.vehicle_plate || "Plaka Yok"}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-drivers" disabled>
                        Aktif şoför bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{activeDrivers.length} aktif şoför mevcut</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNotes">Müşteri Notları</Label>
                <Textarea
                  id="customerNotes"
                  value={formData.customerNotes}
                  onChange={(e) => handleInputChange("customerNotes", e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Güncelleniyor..." : "Görevi Güncelle"}
                </Button>
                <Button type="button" onClick={onClose} variant="outline" className="flex-1 bg-transparent">
                  İptal
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Sefer Belgeleri</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Resmi sefer belgelerini ve diğer gerekli evrakları yükleyin.
                </p>
                <OperationsFileUpload taskId={task.id} fileType="trip_document" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Müşteri Belgeleri</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Müşteri pasaport görüntülerini ve kimlik belgelerini görüntüleyin ve yönetin.
                </p>
                <FileUpload taskId={task.id} profileId={task.created_by} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
