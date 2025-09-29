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
    // Bu alanlar artık gizli - backend için boş gönderilecek
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
  const [isSearchingPickup, setIsSearchingPickup] = useState(false)
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false)
  
  const pickupRef = useRef<HTMLDivElement>(null)
  const dropoffRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Şoför verilerini düzgün şekilde filtreleme
  const activeDrivers = drivers.filter((driver) => {
    // driver doğrudan driver_info içeriyor mu kontrol et
    return driver.driver_info?.is_active === true || driver.is_active === true
  })

  console.log("[TaskCreationForm] All drivers:", drivers)
  console.log("[TaskCreationForm] Active drivers:", activeDrivers)

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
  const searchAddress = async (query: string, isPickup: boolean): Promise<AddressSuggestion[]> => {
    if (!query || query.length < 3) {
      return []
    }

    try {
      if (isPickup) {
        setIsSearchingPickup(true)
      } else {
        setIsSearchingDropoff(true)
      }

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
      if (isPickup) {
        setIsSearchingPickup(false)
      } else {
        setIsSearchingDropoff(false)
      }
    }
  }

  // Handle pickup address input with debouncing
  const handlePickupAddressChange = async (value: string) => {
    handleInputChange("pickupLocation", value)
    handleInputChange("pickupCoordinates", "")
    
    if (value.length >= 3) {
      const suggestions = await searchAddress(value, true)
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
      const suggestions = await searchAddress(value, false)
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
    console.log("[TaskCreationForm] Selected driver ID:", driverId)
    
    const selectedDriver = drivers.find((d) => d.id === driverId)
    console.log("[TaskCreationForm] Selected driver:", selectedDriver)
    
    // Farklı veri yapılarına göre plaka bilgisini al
    const vehiclePlate = selectedDriver?.driver_info?.vehicle_plate || 
                        selectedDriver?.vehicle_plate || 
                        selectedDriver?.vehicle_info?.plate || 
                        ""

    setFormData((prev) => ({
      ...prev,
      assignedDriverId: driverId === "null" ? null : driverId,
      vehiclePlate: vehiclePlate
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

      // Point format için doğru syntax: (lat,lon)
      const formatCoordinates = (coords: string) => {
        if (!coords) return null;
        const [lat, lon] = coords.split(',').map(c => c.trim());
        return `(${lat},${lon})`;
      };

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
        pickup_coordinates: formatCoordinates(formData.pickupCoordinates),
        dropoff_coordinates: formatCoordinates(formData.dropoffCoordinates),
        // Bu alanlar null olarak gönderilecek
        estimated_pickup_time: null,
        actual_pickup_time: null,
        estimated_dropoff_time: null,
        actual_dropoff_time: null,
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

  // Şoför görüntüleme adı oluşturma
  const getDriverDisplayName = (driver: any) => {
    if (!driver) return "Bilinmeyen Şoför";
    
    // Farklı veri yapılarına göre isim bilgisini al
    const name = driver.full_name || 
                driver.name || 
                `${driver.first_name || ''} ${driver.last_name || ''}`.trim() ||
                "İsimsiz Şoför";
    
    // Farklı veri yapılarına göre plaka bilgisini al
    const plate = driver.driver_info?.vehicle_plate || 
                 driver.vehicle_plate || 
                 driver.vehicle_info?.plate || 
                 "Plaka yok";
    
    return `${name} - ${plate}`;
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
                      onFocus={() => {
                        if (pickupSuggestions.length > 0) {
                          setShowPickupSuggestions(true)
                        }
                      }}
                      placeholder="Örn: İstanbul Havalimanı"
                      required
                    />
                    {isSearchingPickup && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {showPickupSuggestions && pickupSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {pickupSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => handlePickupAddressSelect(suggestion)}
                          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                        >
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">
                                {suggestion.display_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Koordinat: {suggestion.lat}, {suggestion.lon}
                              </div>
                            </div>
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
                      onFocus={() => {
                        if (dropoffSuggestions.length > 0) {
                          setShowDropoffSuggestions(true)
                        }
                      }}
                      placeholder="Örn: Taksim Meydanı"
                      required
                    />
                    {isSearchingDropoff && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {dropoffSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => handleDropoffAddressSelect(suggestion)}
                          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                        >
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">
                                {suggestion.display_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Koordinat: {suggestion.lat}, {suggestion.lon}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Koordinat alanları gizli - sadece backend için */}
              <div className="hidden">
                <Input
                  id="pickupCoordinates"
                  value={formData.pickupCoordinates}
                  onChange={(e) => handleInputChange("pickupCoordinates", e.target.value)}
                />
                <Input
                  id="dropoffCoordinates"
                  value={formData.dropoffCoordinates}
                  onChange={(e) => handleInputChange("dropoffCoordinates", e.target.value)}
                />
                {/* Gizli zaman alanları */}
                <Input
                  id="estimatedPickupTime"
                  value={formData.estimatedPickupTime}
                  onChange={(e) => handleInputChange("estimatedPickupTime", e.target.value)}
                />
                <Input
                  id="estimatedDropoffTime"
                  value={formData.estimatedDropoffTime}
                  onChange={(e) => handleInputChange("estimatedDropoffTime", e.target.value)}
                />
                <Input
                  id="actualPickupTime"
                  value={formData.actualPickupTime}
                  onChange={(e) => handleInputChange("actualPickupTime", e.target.value)}
                />
                <Input
                  id="actualDropoffTime"
                  value={formData.actualDropoffTime}
                  onChange={(e) => handleInputChange("actualDropoffTime", e.target.value)}
                />
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

              {/* Şoför Atama Bölümü */}
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
                          {getDriverDisplayName(driver)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Aktif şoför bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">{activeDrivers.length} aktif şoför mevcut</p>
                  {formData.vehiclePlate && (
                    <p className="text-xs text-green-600 font-medium">
                      Seçili araç: {formData.vehiclePlate}
                    </p>
                  )}
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
