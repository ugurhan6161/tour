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
import { ArrowLeft, MapPin, FileText, AlertTriangle, CheckCircle } from "lucide-react"

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
    assignedDriverId: "" as string, // null yerine boş string kullan
    vehiclePlate: "",
    passengerCount: "1",
    luggage: "normal",
    priority: "normal",
    trackingEnabled: true,
    requiresDocument: false,
    pickupCoordinates: "",
    dropoffCoordinates: "",
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

  const activeDrivers = drivers.filter((driver) => {
    const isActive = driver.driver_info?.is_active === true || driver.is_active === true
    console.log("[v0] Driver filter check:", {
      driver_id: driver.id,
      full_name: driver.full_name,
      is_active: isActive,
      driver_info: driver.driver_info,
    })
    return isActive
  })

  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string>("")

  console.log("[v0] TaskCreationForm - All drivers:", drivers)
  console.log("[v0] TaskCreationForm - Active drivers:", activeDrivers)
  console.log("[v0] TaskCreationForm - Current assignedDriverId:", formData.assignedDriverId)

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

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("is_active", true)
          .order("plate", { ascending: true })

        if (error) {
          console.error("[TaskCreationForm] Error fetching vehicles:", error.message)
          // Vehicles tablosu yoksa boş array kullan
          setVehicles([])
        } else {
          setVehicles(data || [])
          console.log("[v0] Vehicles loaded:", data?.length || 0)
        }
      } catch (err) {
        console.error("[TaskCreationForm] Exception fetching vehicles:", err)
        setVehicles([])
      }
    }

    fetchVehicles()
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=tr`,
      )

      if (!response.ok) {
        throw new Error("Adres arama başarısız")
      }

      const data = await response.json()
      return data.map((item: any) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
      }))
    } catch (error) {
      console.error("Adres arama hatası:", error)
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
    console.log("[v0] Driver selection changed:", {
      selected_driver_id: driverId,
      is_unassigned: driverId === "unassigned",
    })

    setFormData((prev) => ({
      ...prev,
      assignedDriverId: driverId === "unassigned" ? "" : driverId,
    }))

    console.log("[v0] Form data updated with driver:", driverId === "unassigned" ? "none" : driverId)
  }

  const handleVehicleChange = (vehicleId: string) => {
    if (vehicleId === "none") {
      setSelectedVehicle("")
      setFormData((prev) => ({
        ...prev,
        vehiclePlate: "",
      }))
      return
    }

    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (vehicle) {
      setSelectedVehicle(vehicleId)
      setFormData((prev) => ({
        ...prev,
        vehiclePlate: vehicle.plate,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Gerekli alan kontrolü
      if (
        !formData.title ||
        !formData.pickupLocation ||
        !formData.dropoffLocation ||
        !formData.pickupDate ||
        !formData.customerName ||
        !formData.customerPhone
      ) {
        throw new Error("Lütfen tüm gerekli alanları doldurun")
      }

      // Telefon format kontrolü
      const phoneRegex = /^[+]?[(]?[\d\s\-$$$$]{10,}$/
      if (!phoneRegex.test(formData.customerPhone)) {
        throw new Error("Geçerli bir telefon numarası girin")
      }

      // Point format için doğru syntax: (lat,lon)
      const formatCoordinates = (coords: string) => {
        if (!coords) return null
        const [lat, lon] = coords.split(",").map((c) => c.trim())
        return `(${lat},${lon})`
      }

      // DÜZELTME: assigned_driver_id null veya UUID olmalı
      const assignedDriverId =
        formData.assignedDriverId && formData.assignedDriverId !== "" ? formData.assignedDriverId : null

      const taskStatus = assignedDriverId ? "assigned" : "new"

      const taskData = {
        title: formData.title,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime || null,
        estimated_duration: formData.estimatedDuration ? Number.parseInt(formData.estimatedDuration) : null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_notes: formData.customerNotes || null,
        assigned_driver_id: assignedDriverId,
        vehicle_plate: formData.vehiclePlate || null,
        vehicle_id: selectedVehicle || null, // vehicle_id ekle
        passenger_count: Number.parseInt(formData.passengerCount),
        luggage_info: formData.luggage,
        priority: formData.priority,
        tracking_enabled: formData.trackingEnabled,
        requires_document: formData.requiresDocument,
        pickup_coordinates: formatCoordinates(formData.pickupCoordinates),
        dropoff_coordinates: formatCoordinates(formData.dropoffCoordinates),
        estimated_pickup_time: null,
        actual_pickup_time: null,
        estimated_dropoff_time: null,
        actual_dropoff_time: null,
        created_by: profile.id,
        status: taskStatus, // Dinamik status - şöför atanmışsa "assigned", yoksa "new"
      }

      console.log("[TaskCreationForm] Submitting task data:", JSON.stringify(taskData, null, 2))

      const { data: taskResult, error: taskError } = await supabase.from("tasks").insert(taskData).select().single()

      if (taskError) {
        console.error("[TaskCreationForm] Error inserting task:", taskError)
        throw new Error(`Görev oluşturma başarısız: ${taskError.message}`)
      }

      console.log("[TaskCreationForm] Task created successfully:", taskResult)

      // DÜZELTME: Tracking link oluşturma - expires_at eklendi
      if (formData.trackingEnabled) {
        const trackingCode = crypto.randomUUID()

        // 30 gün sonrası için expires_at hesapla
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        const trackingData = {
          task_id: taskResult.id,
          tracking_code: trackingCode,
          is_active: true,
          expires_at: expiresAt.toISOString(), // expires_at eklendi
        }

        console.log("[TaskCreationForm] Creating tracking link:", trackingData)

        const { data: trackingResult, error: trackingError } = await supabase
          .from("tracking_links")
          .insert(trackingData)
          .select()
          .single()

        if (trackingError) {
          console.error("[TaskCreationForm] Error creating tracking link:", trackingError)
          // Tracking link hatası görev oluşturmayı engellemez, sadece logla
          console.warn("Tracking link oluşturulamadı ancak görev başarıyla oluşturuldu")
        } else {
          console.log("[TaskCreationForm] Tracking link created:", trackingResult)
        }
      }

      // Başarılı olursa callback'i çağır
      onSuccess()
    } catch (err: any) {
      console.error("[TaskCreationForm] Submission error:", err)
      setError(err.message || "Bilinmeyen bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDriverDisplayName = (driver: any) => {
    if (!driver) {
      console.log("[v0] getDriverDisplayName - driver is null/undefined")
      return "Bilinmeyen Şoför"
    }

    // Farklı veri yapılarına göre isim bilgisini al
    const name =
      driver.full_name ||
      driver.name ||
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
      "İsimsiz Şoför"

    console.log("[v0] getDriverDisplayName:", {
      driver_id: driver.id,
      display_name: name,
      full_name: driver.full_name,
    })

    return name
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <Button onClick={onCancel} variant="outline" className="mb-4 sm:mb-6 bg-transparent">
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
                <Label htmlFor="title" className="text-sm font-medium">
                  Görev Başlığı
                </Label>
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
                  <Label htmlFor="pickupLocation" className="text-sm font-medium">
                    Alış Konumu
                  </Label>
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
                          onMouseDown={(e) => e.preventDefault()}
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
                  <Label htmlFor="dropoffLocation" className="text-sm font-medium">
                    Bırakış Konumu
                  </Label>
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
                          onMouseDown={(e) => e.preventDefault()}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-sm font-medium">
                    Alış Tarihi
                  </Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                    required
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm font-medium">
                    Müşteri Adı
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-sm font-medium">
                    Müşteri Telefonu
                  </Label>
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
                  <Label htmlFor="passengerCount" className="text-sm font-medium">
                    Yolcu Sayısı
                  </Label>
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
                  <Label htmlFor="luggage" className="text-sm font-medium">
                    Bagaj Bilgisi
                  </Label>
                  <Select value={formData.luggage} onValueChange={(value) => handleInputChange("luggage", value)}>
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
                  <Label htmlFor="priority" className="text-sm font-medium">
                    Öncelik
                  </Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
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
                  <Label htmlFor="estimatedDuration" className="text-sm font-medium">
                    Tahmini Süre (dakika)
                  </Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => handleInputChange("estimatedDuration", e.target.value)}
                    placeholder="Örn: 60"
                  />
                </div>
              </div>

              {/* DÜZELTME: Şoför Atama Bölümü */}
              <div className="space-y-2">
                <Label htmlFor="assignedDriverId" className="text-sm font-medium">
                  Şoför Ataması (İsteğe Bağlı)
                </Label>
                <Select value={formData.assignedDriverId || "unassigned"} onValueChange={handleDriverChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şoför seçin veya atanmamış bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Atanmamış</SelectItem>
                    {activeDrivers.length > 0 ? (
                      activeDrivers.map((driver) => {
                        console.log("[v0] Rendering driver option:", {
                          id: driver.id,
                          name: getDriverDisplayName(driver),
                        })
                        return (
                          <SelectItem key={driver.id} value={driver.id}>
                            {getDriverDisplayName(driver)}
                          </SelectItem>
                        )
                      })
                    ) : (
                      <SelectItem value="none" disabled>
                        Aktif şoför bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {activeDrivers.length} aktif şoför mevcut. Şoför seçimi görev durumunu "Atanmış" yapar.
                </p>
                {activeDrivers.length === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Aktif şoför bulunamadı. Lütfen önce şoför ekleyin ve aktif duruma getirin.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleSelect" className="text-sm font-medium">
                  Araç Seçimi (İsteğe Bağlı)
                </Label>
                <Select value={selectedVehicle || "none"} onValueChange={handleVehicleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kayıtlı araçlardan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Araç seçmeyin</SelectItem>
                    {vehicles.length > 0 ? (
                      vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.model} ({vehicle.capacity} kişi)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>
                        Kayıtlı araç bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {vehicles.length > 0
                    ? `${vehicles.length} aktif araç mevcut. Araç seçerseniz plaka otomatik doldurulur.`
                    : "Henüz kayıtlı araç yok. Araçlar bölümünden araç ekleyebilirsiniz."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehiclePlate" className="text-sm font-medium">
                  Araç Plakası (Düzenlenebilir)
                </Label>
                <Input
                  id="vehiclePlate"
                  value={formData.vehiclePlate}
                  onChange={(e) => handleInputChange("vehiclePlate", e.target.value)}
                  placeholder="Örn: 34 ABC 123"
                />
                <p className="text-xs text-gray-500">
                  Araç seçtiğinizde plaka otomatik doldurulur, ancak manuel olarak da değiştirebilirsiniz
                </p>
              </div>

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

              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <Checkbox
                  id="trackingEnabled"
                  checked={formData.trackingEnabled}
                  onCheckedChange={(checked) => handleInputChange("trackingEnabled", checked)}
                />
                <Label htmlFor="trackingEnabled" className="text-sm cursor-pointer">
                  Müşteri takip linki oluştur (30 gün geçerli)
                </Label>
              </div>

              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Görev Oluştur
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1 bg-transparent"
                  disabled={isSubmitting}
                >
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
