"use client";

import type React from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, User } from "lucide-react";

interface DriverTransferModalProps {
  task: any;
  drivers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function DriverTransferModal({ task, drivers, onClose, onSuccess }: DriverTransferModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(task.assigned_driver_id);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Normalize driver data structure
  const normalizeDriverData = (driver: any) => {
    // Handle different data structures based on the other components
    if (driver.drivers) {
      // From operations-dashboard structure: profile with drivers nested
      return {
        user_id: driver.id,
        full_name: driver.full_name,
        phone: driver.phone,
        vehicle_plate: driver.drivers.vehicle_plate || driver.driver_info?.vehicle_plate,
        license_number: driver.drivers.license_number || driver.driver_info?.license_number,
        is_active: driver.drivers.is_active ?? driver.driver_info?.is_active ?? true
      };
    } else if (driver.driver_info) {
      // From drivers-management structure: profile with driver_info nested
      return {
        user_id: driver.id,
        full_name: driver.full_name,
        phone: driver.phone,
        vehicle_plate: driver.driver_info.vehicle_plate,
        license_number: driver.driver_info.license_number,
        is_active: driver.driver_info.is_active ?? true
      };
    } else {
      // Direct driver structure or fallback
      return {
        user_id: driver.id || driver.user_id,
        full_name: driver.full_name,
        phone: driver.phone,
        vehicle_plate: driver.vehicle_plate,
        license_number: driver.license_number,
        is_active: driver.is_active ?? true
      };
    }
  };

  // Get normalized drivers and filter active ones
  const normalizedDrivers = drivers.map(normalizeDriverData);
  const activeDrivers = normalizedDrivers.filter(driver => driver.is_active === true);

  // Find current driver
  const getCurrentDriverInfo = () => {
    if (!task.assigned_driver_id) return null;
    
    const currentDriver = normalizedDrivers.find(driver => 
      driver.user_id === task.assigned_driver_id
    );
    
    return currentDriver;
  };

  const currentDriverInfo = getCurrentDriverInfo();

  const handleTransfer = async () => {
    if (!selectedDriverId && selectedDriverId !== null) {
      setError("Lütfen bir şoför seçin");
      return;
    }

    if (selectedDriverId === task.assigned_driver_id) {
      setError("Bu görev zaten seçilen şoföre atanmış");
      return;
    }

    const confirmMessage = selectedDriverId 
      ? `Bu görevi seçilen şoföre aktarmak istediğinizden emin misiniz?`
      : `Bu görevden şoför atamasını kaldırmak istediğinizden emin misiniz?`;

    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsTransferring(true);
    setError(null);
    
    try {
      const updateData = {
        assigned_driver_id: selectedDriverId,
        status: selectedDriverId ? "assigned" : "new",
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) throw error;
      
      onSuccess();
    } catch (error) {
      console.error("Error transferring task:", error);
      setError("Görev aktarımı sırasında hata oluştu");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleQuickTransfer = async (targetDriverId: string) => {
    if (!confirm(`Bu görevi seçilen şoföre hızlıca aktarmak istediğinizden emin misiniz?`)) {
      return;
    }
    
    setIsTransferring(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          assigned_driver_id: targetDriverId,
          status: "assigned",
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;
      
      onSuccess();
    } catch (error) {
      console.error("Error transferring task:", error);
      setError("Görev aktarımı sırasında hata oluştu");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5 text-orange-600" />
            <span>Görev Aktarımı</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Görev Bilgileri */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-800 mb-2">Görev Bilgileri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Görev:</span> {task.title}
              </div>
              <div>
                <span className="font-medium">Müşteri:</span> {task.customer_name}
              </div>
              <div>
                <span className="font-medium">Tarih:</span> {new Date(task.pickup_date).toLocaleDateString('tr-TR')}
              </div>
              <div>
                <span className="font-medium">Güzergah:</span> {task.pickup_location} → {task.dropoff_location}
              </div>
            </div>
          </div>

          {/* Mevcut Şoför */}
          {currentDriverInfo && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Şu Anki Şoför</h4>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{currentDriverInfo.full_name || 'Bilinmeyen Şoför'}</p>
                  <p className="text-sm text-gray-600">{currentDriverInfo.vehicle_plate || 'Plaka Yok'}</p>
                  {currentDriverInfo.phone && (
                    <p className="text-sm text-gray-600">{currentDriverInfo.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manuel Aktarım */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-4">Manuel Şoför Seçimi</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverSelect">Şoför Seçin</Label>
                <Select 
                  value={selectedDriverId || "null"} 
                  onValueChange={(value) => setSelectedDriverId(value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Şoför seçin veya atanmamış bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Atanmamış</SelectItem>
                    {activeDrivers.length > 0 ? (
                      activeDrivers.map((driver) => (
                        <SelectItem key={driver.user_id} value={driver.user_id}>
                          {driver.full_name || "İsim Yok"} - {driver.vehicle_plate || "Plaka Yok"}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-drivers" disabled>
                        Aktif şoför bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleTransfer} 
                disabled={isTransferring}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isTransferring ? "Aktarılıyor..." : "Aktarımı Gerçekleştir"}
              </Button>
            </div>
          </div>

          {/* Hızlı Aktarım */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-4">Hızlı Aktarım</h4>
            <p className="text-sm text-green-600 mb-4">
              Aşağıdaki şoförlere tek tıkla hızlıca aktarın.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeDrivers
                .filter(driver => driver.user_id !== task.assigned_driver_id)
                .map((driver) => (
                  <Button
                    key={driver.user_id}
                    onClick={() => handleQuickTransfer(driver.user_id)}
                    disabled={isTransferring}
                    variant="outline"
                    className="h-auto p-4 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 text-left"
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ArrowRightLeft className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{driver.full_name}</p>
                        <p className="text-sm text-gray-600">{driver.vehicle_plate}</p>
                        {driver.phone && (
                          <p className="text-xs text-gray-500">{driver.phone}</p>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
            </div>
            
            {activeDrivers.filter(d => d.user_id !== task.assigned_driver_id).length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Aktarım için uygun şoför bulunmuyor</p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              İptal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}