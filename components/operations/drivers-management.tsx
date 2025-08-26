"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Phone, Car, User, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react"

interface DriversManagementProps {
  drivers: any[]
  onDriverUpdate: () => void
}

export default function DriversManagement({ drivers, onDriverUpdate }: DriversManagementProps) {
  const [editingDriver, setEditingDriver] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    vehicle_plate: "",
    license_number: "",
    is_active: true,
  })
  const supabase = createClient()

  console.log("[v0] Drivers data structure:", JSON.stringify(drivers, null, 2))

  const handleEdit = (driver: any) => {
    console.log("[v0] Editing driver:", JSON.stringify(driver, null, 2))

    setEditingDriver(driver)
    setFormData({
      full_name: driver.full_name || "",
      phone: driver.phone || "",
      vehicle_plate: driver.drivers?.vehicle_plate || driver.vehicle_plate || "",
      license_number: driver.drivers?.license_number || driver.license_number || "",
      is_active: driver.drivers?.is_active ?? driver.is_active ?? true,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (driverId: string) => {
    if (confirm("Bu şöförü silmek istediğinizden emin misiniz?")) {
      const { error } = await supabase.from("profiles").delete().eq("id", driverId)

      if (!error) {
        onDriverUpdate()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq("id", editingDriver.id)

      if (profileError) throw profileError

      const driverId = editingDriver.drivers?.user_id || editingDriver.id

      if (editingDriver.drivers?.user_id || editingDriver.user_id) {
        const { error: driverError } = await supabase
          .from("drivers")
          .update({
            vehicle_plate: formData.vehicle_plate,
            license_number: formData.license_number,
            is_active: formData.is_active,
          })
          .eq("user_id", driverId)

        if (driverError) throw driverError
      } else {
        const { error: createDriverError } = await supabase.from("drivers").insert({
          user_id: editingDriver.id,
          vehicle_plate: formData.vehicle_plate,
          license_number: formData.license_number,
          is_active: formData.is_active,
        })

        if (createDriverError) throw createDriverError
      }

      setIsDialogOpen(false)
      setEditingDriver(null)
      onDriverUpdate()
    } catch (error) {
      console.error("Error updating driver:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Şöför Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => {
              const driverInfo = driver.drivers || driver
              const vehiclePlate = driverInfo?.vehicle_plate || "Araç yok"
              const isActive = driverInfo?.is_active ?? true
              const licenseNumber = driverInfo?.license_number

              return (
                <Card key={driver.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-600 text-white">
                            {driver.full_name?.charAt(0) || "Ş"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">{driver.full_name}</h3>
                          <Badge
                            className={`text-xs ${
                              isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{driver.phone || "Telefon yok"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{vehiclePlate}</span>
                      </div>
                      {licenseNumber && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Ehliyet: {licenseNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <Button
                        onClick={() => handleEdit(driver)}
                        size="sm"
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Düzenle</span>
                      </Button>
                      <Button
                        onClick={() => handleDelete(driver.id)}
                        size="sm"
                        variant="outline"
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Sil</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {drivers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Şöför bulunamadı.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şöför Bilgilerini Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_plate">Araç Plakası</Label>
              <Input
                id="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_plate: e.target.value }))}
                placeholder="Örn: 34 ABC 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">Ehliyet Numarası</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, license_number: e.target.value }))}
                placeholder="Ehliyet numarasını girin"
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="flex-1">
                Kaydet
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
