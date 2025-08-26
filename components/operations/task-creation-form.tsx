"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, MapPin, User, Phone } from "lucide-react"

interface TaskCreationFormProps {
  drivers: any[]
  onCancel: () => void
  onSuccess: () => void
  profile: any
}

export default function TaskCreationForm({ drivers, onCancel, onSuccess, profile }: TaskCreationFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    pickupLocation: "",
    dropoffLocation: "",
    pickupDate: "",
    pickupTime: "",
    customerName: "",
    customerPhone: "",
    customerNotes: "",
    assignedDriverId: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const taskData = {
        title: formData.title,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_notes: formData.customerNotes || null,
        assigned_driver_id: formData.assignedDriverId,
        status: formData.assignedDriverId ? "assigned" : "new",
        created_by: profile.id,
      }

      const { error } = await supabase.from("tasks").insert([taskData])

      if (error) throw error

      onSuccess()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeDrivers = drivers.filter((driver) => {
    const driverInfo = driver.drivers || driver
    return driverInfo?.is_active === true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onCancel} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Panele Dön</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Yeni Görev Oluştur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Görev Başlığı *
                </Label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="örn: Havalimanı Transferi - Ahmet Yılmaz"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-sm font-medium flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Alış Tarihi *</span>
                  </Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    required
                    value={formData.pickupDate}
                    onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupTime" className="text-sm font-medium">
                    Alış Saati
                  </Label>
                  <Input
                    id="pickupTime"
                    type="time"
                    value={formData.pickupTime}
                    onChange={(e) => handleInputChange("pickupTime", e.target.value)}
                  />
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation" className="text-sm font-medium flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span>Alış Noktası *</span>
                  </Label>
                  <Input
                    id="pickupLocation"
                    type="text"
                    required
                    value={formData.pickupLocation}
                    onChange={(e) => handleInputChange("pickupLocation", e.target.value)}
                    placeholder="örn: İstanbul Havalimanı Terminal 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoffLocation" className="text-sm font-medium flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span>Bırakış Noktası *</span>
                  </Label>
                  <Input
                    id="dropoffLocation"
                    type="text"
                    required
                    value={formData.dropoffLocation}
                    onChange={(e) => handleInputChange("dropoffLocation", e.target.value)}
                    placeholder="örn: Sultanahmet Oteli"
                  />
                </div>
              </div>

              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm font-medium flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Müşteri Adı *</span>
                  </Label>
                  <Input
                    id="customerName"
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="örn: Ahmet Yılmaz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-sm font-medium flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>Müşteri Telefonu *</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                    placeholder="örn: +90 555 123 4567"
                  />
                </div>
              </div>

              {/* Driver Assignment */}
              <div className="space-y-2">
                <Label htmlFor="assignedDriverId" className="text-sm font-medium">
                  Şöför Ataması (İsteğe Bağlı)
                </Label>
                <Select
                  value={formData.assignedDriverId || "null"}
                  onValueChange={(value) => handleInputChange("assignedDriverId", value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Şöför seçin veya atanmamış bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Atanmamış</SelectItem>
                    {activeDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name} - {(driver.drivers || driver)?.vehicle_plate || "Plaka yok"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{activeDrivers.length} aktif şöför mevcut</p>
              </div>

              {/* Customer Notes */}
              <div className="space-y-2">
                <Label htmlFor="customerNotes" className="text-sm font-medium">
                  Müşteri Notları
                </Label>
                <Textarea
                  id="customerNotes"
                  value={formData.customerNotes}
                  onChange={(e) => handleInputChange("customerNotes", e.target.value)}
                  placeholder="Özel talimatlar veya notlar..."
                  rows={3}
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? "Oluşturuluyor..." : "Görev Oluştur"}
                </Button>
                <Button type="button" onClick={onCancel} variant="outline" className="flex-1 bg-transparent">
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
