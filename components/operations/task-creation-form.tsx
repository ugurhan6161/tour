"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Calendar, MapPin, User, Phone, FileText, Clock, Car, AlertTriangle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TaskCreationFormProps {
  drivers: any[]
  onCancel: () => void
  onSuccess: () => void
  profile: any
}

interface AddressSuggestion {
  display_name: string
  lat: string
  lon: string
}

export default function TaskCreationForm({ drivers, onCancel, onSuccess, profile }: TaskCreationFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    pickupLocation: "",
    dropoffLocation: "",
    pickupDate: "",
    pickupTime: "",
    estimatedDuration: "",
    customerName: "",
    customerPhone: "",
    customerNotes: "",
    assignedDriverId: null as string | null,
    vehiclePlate: "",
    passengerCount: "1",
    luggage: "normal",
    priority: "normal",
    trackingEnabled: true,
    requiresDocument: false,
    pickupCoordinates: "",
    dropoffCoordinates: "",
    estimatedPickupTime: "",
    actualPickupTime: "",
    estimatedDropoffTime: "",
    actualDropoffTime: ""
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<AddressSuggestion[]>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const pickupRef = useRef<HTMLDivElement>(null)
  const dropoffRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const activeDrivers = drivers.filter((driver) => driver.driver_info?.is_active === true)

  // Click outside handler for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) {
        setShowPickupSuggestions(false)
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target as Node)) {
        setShowDropoffSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Search addresses using OpenStreetMap Nominatim
  const searchAddress = async (query: string): Promise<AddressSuggestion[]> => {
    if (!query || query.length < 3) {
      return []
    }

    try {
      setIsSearching(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=tr`
      )
      
      if (!response.ok) {
        throw new Error('Adres arama başarısız')
      }

      const data = await response.json()
      return data.map((item: any) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon
      }))
    } catch (error) {
      console.error('Adres arama hatası:', error)
      return []
    } finally {
      setIsSearching(false)
    }
  }

  // Handle pickup address input with debouncing
  const handlePickupAddressChange = async (value: string) => {
    handleInputChange("pickupLocation", value)
    handleInputChange("pickupCoordinates", "")
    
    if (value.length >= 3) {
      const suggestions = await searchAddress(value)
      setPickupSuggestions(suggestions)
      setShowPickupSuggestions(true)
    } else {
      setPickupSuggestions([])
      setShowPickupSuggestions(false)
    }
  }

  // Handle dropoff address input with debouncing
  const handleDropoffAddressChange = async (value: string) => {
    handleInputChange("dropoffLocation", value)
    handleInputChange("dropoffCoordinates", "")
    
    if (value.length >= 3) {
      const suggestions = await searchAddress(value)
      setDropoffSuggestions(suggestions)
      setShowDropoffSuggestions(true)
    } else {
      setDropoffSuggestions([])
      setShowDropoffSuggestions(false)
    }
  }

  // Select pickup address from suggestions
  const handlePickupAddressSelect = (suggestion: AddressSuggestion) => {
    handleInputChange("pickupLocation", suggestion.display_name)
    handleInputChange("pickupCoordinates", `${suggestion.lat},${suggestion.lon}`)
    setShowPickupSuggestions(false)
    setPickupSuggestions([])
  }

  // Select dropoff address from suggestions
  const handleDropoffAddressSelect = (suggestion: AddressSuggestion) => {
    handleInputChange("dropoffLocation", suggestion.display_name)
    handleInputChange("dropoffCoordinates", `${suggestion.lat},${suggestion.lon}`)
    setShowDropoffSuggestions(false)
    setDropoffSuggestions([])
  }

  const handleInputChange = (field: string, value: string | null | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDriverChange = (driverId: string) => {
    const selectedDriver = drivers.find((d) => d.id === driverId)
    setFormData((prev) => ({
      ...prev,
      assignedDriverId: driverId === "null" ? null : driverId,
      vehiclePlate: driverId === "null" ? "" : selectedDriver?.driver_info?.vehicle_plate || ""
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.title || !formData.pickupLocation || !formData.dropoffLocation || !formData.pickupDate || !formData.customerName || !formData.customerPhone) {
        throw new Error('Lütfen tüm gerekli alanları doldurun')
      }

      const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/
      if (!phoneRegex.test(formData.customerPhone)) {
        throw new Error('Geçerli bir telefon numarası girin')
      }

      const taskData = {
        title: formData.title,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime || null,
        estimated_duration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_notes: formData.customerNotes || null,
        assigned_driver_id: formData.assignedDriverId,
        vehicle_plate: formData.vehiclePlate || null,
        passenger_count: parseInt(formData.passengerCount),
        luggage_info: formData.luggage,
        priority: formData.priority,
        tracking_enabled: formData.trackingEnabled,
        requires_document: formData.requiresDocument,
        pickup_coordinates: formData.pickupCoordinates ? formData.pickupCoordinates.split(',').map(c => parseFloat(c.trim())) : null,
        dropoff_coordinates: formData.dropoffCoordinates ? formData.dropoffCoordinates.split(',').map(c => parseFloat(c.trim())) : null,
        estimated_pickup_time: formData.estimatedPickupTime || null,
        actual_pickup_time: formData.actualPickupTime || null,
        estimated_dropoff_time: formData.estimatedDropoffTime || null,
        actual_dropoff_time: formData.actualDropoffTime || null,
        created_by: profile.id
      }

      console.log("[TaskCreationForm] Submitting task data:", JSON.stringify(taskData, null, 2))

      const { data: taskResult, error: taskError } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single()

      if (taskError) {
        console.error("[TaskCreationForm] Error inserting task:", taskError)
        throw new Error(`Görev oluşturma başarısız: ${taskError.message}`)
      }

      if (formData.trackingEnabled) {
        const trackingCode = crypto.randomUUID()
        const { error: trackingError } = await supabase
          .from("tracking_links")
          .insert({
            task_id: taskResult.id,
            tracking_code: trackingCode,
            is_active: true
          })

        if (trackingError) {
          console.error("[TaskCreationForm] Error creating tracking link:", trackingError)
          throw new Error(`Takip bağlantısı oluşturma başarısız: ${trackingError.message}`)
        }
      }

      onSuccess()
    } catch (err: any) {
      console.error("[TaskCreationForm] Submission error:", err.message)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <Button onClick={onCancel} variant="outline" className="mb-4 sm:mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Yeni Görev Oluştur</CardTitle>
                <p className="text-sm text-gray-600">Yeni bir tur rezervasyonu oluşturun</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Görev Başlığı</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Örn: İstanbul Havalimanı Transferi"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative" ref={pickupRef}>
                  <Label htmlFor="pickupLocation" className="text-sm font-medium">Alış Konumu</Label>
                  <div className="relative">
                    <Input
                      id="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={(e) => handlePickupAddressChange(e.target.value)}
                      placeholder="Örn: İstanbul Havalimanı"
                      required
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {showPickupSuggestions && pickupSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {pickupSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          onClick={() => handlePickupAddressSelect(suggestion)}
                        >
                          <div className="text-sm font-medium text-gray-800">
                            {suggestion.display_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {suggestion.lat}, {suggestion.lon}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 relative" ref={dropoffRef}>
                  <Label htmlFor="dropoffLocation" className="text-sm font-medium">Bırakış Konumu</Label>
                  <div className="relative">
                    <Input
                      id="dropoffLocation"
                      value={formData.dropoffLocation}
                      onChange={(e) => handleDropoffAddressChange(e.target.value)}
                      placeholder="Örn: Taksim Meydanı"
                      required
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {dropoffSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          onClick={() => handleDropoffAddressSelect(suggestion)}
                        >
                          <div className="text-sm font-medium text-gray-800">
                            {suggestion.display_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {suggestion.lat}, {suggestion.lon}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Koordinat alanları - artık otomatik dolacak */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupCoordinates" className="text-sm font-medium">
                    Alış Koordinatları (Enlem,Boylam)
                    {formData.pickupCoordinates && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                        Otomatik
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="pickupCoordinates"
                    value={formData.pickupCoordinates}
                    onChange={(e) => handleInputChange("pickupCoordinates", e.target.value)}
                    placeholder="Adres seçildiğinde otomatik dolacak"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoffCoordinates" className="text-sm font-medium">
                    Bırakış Koordinatları (Enlem,Boylam)
                    {formData.dropoffCoordinates && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                        Otomatik
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="dropoffCoordinates"
                    value={formData.dropoffCoordinates}
                    onChange={(e) => handleInputChange("dropoffCoordinates", e.target.value)}
                    placeholder="Adres seçildiğinde otomatik dolacak"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-sm font-medium">Alış Tarihi</Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupTime" className="text-sm font-medium">Alış Saati</Label>
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
                  <Label htmlFor="customerName" className="text-sm font-medium">Müşteri Adı</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-sm font-medium">Müşteri Telefonu</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                    placeholder="Örn: +905551234567"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengerCount" className="text-sm font-medium">Yolcu Sayısı</Label>
                  <Select
                    value={formData.passengerCount}
                    onValueChange={(value) => handleInputChange("passengerCount", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Yolcu sayısı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(10)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} Yolcu
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="luggage" className="text-sm font-medium">Bagaj Bilgisi</Label>
                  <Select
                    value={formData.luggage}
                    onValueChange={(value) => handleInputChange("luggage", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bagaj tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="large">Büyük</SelectItem>
                      <SelectItem value="extra">Ekstra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium">Öncelik</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Öncelik seviyesi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration" className="text-sm font-medium">Tahmini Süre (dakika)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => handleInputChange("estimatedDuration", e.target.value)}
                    placeholder="Örn: 60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedPickupTime" className="text-sm font-medium">Tahmini Alış Zamanı</Label>
                  <Input
                    id="estimatedPickupTime"
                    type="datetime-local"
                    value={formData.estimatedPickupTime}
                    onChange={(e) => handleInputChange("estimatedPickupTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDropoffTime" className="text-sm font-medium">Tahmini Bırakış Zamanı</Label>
                  <Input
                    id="estimatedDropoffTime"
                    type="datetime-local"
                    value={formData.estimatedDropoffTime}
                    onChange={(e) => handleInputChange("estimatedDropoffTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedDriverId" className="text-sm font-medium">Şoför Ataması (İsteğe Bağlı)</Label>
                <Select
                  value={formData.assignedDriverId || "null"}
                  onValueChange={handleDriverChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Şoför seçin veya atanmamış bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Atanmamış</SelectItem>
                    {activeDrivers.length > 0 ? (
                      activeDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name} - {driver.driver_info?.vehicle_plate || "Plaka yok"}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Aktif şoför bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{activeDrivers.length} aktif şoför mevcut</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actualPickupTime" className="text-sm font-medium">Gerçek Alış Zamanı</Label>
                  <Input
                    id="actualPickupTime"
                    type="datetime-local"
                    value={formData.actualPickupTime}
                    onChange={(e) => handleInputChange("actualPickupTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualDropoffTime" className="text-sm font-medium">Gerçek Bırakış Zamanı</Label>
                  <Input
                    id="actualDropoffTime"
                    type="datetime-local"
                    value={formData.actualDropoffTime}
                    onChange={(e) => handleInputChange("actualDropoffTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNotes" className="text-sm font-medium">Müşteri Notları</Label>
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
