"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Car, Plus, Edit, Trash2, Search, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface Vehicle {
  id: string
  plate: string
  model: string
  color: string | null
  year: number | null
  capacity: number
  is_active: boolean
  notes: string | null
  created_at: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [profile, setProfile] = useState<any>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
    fetchVehicles()
  }, [])

  useEffect(() => {
    // Search filter
    if (searchQuery) {
      const filtered = vehicles.filter(
        (v) =>
          v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.model.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredVehicles(filtered)
    } else {
      setFilteredVehicles(vehicles)
    }
  }, [searchQuery, vehicles])

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (profileData?.role !== "operations" && profileData?.role !== "admin") {
      router.push("/")
      return
    }

    setProfile(profileData)
  }

  const fetchVehicles = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setVehicles(data || [])
      setFilteredVehicles(data || [])
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVehicle = () => {
    setEditingVehicle(null)
    setShowAddForm(true)
  }

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setShowAddForm(true)
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Bu aracı silmek istediğinizden emin misiniz?")) return

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId)
      if (error) throw error
      fetchVehicles()
    } catch (error) {
      console.error("Error deleting vehicle:", error)
      alert("Araç silinirken bir hata oluştu")
    }
  }

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setEditingVehicle(null)
    fetchVehicles()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (showAddForm) {
    return (
      <VehicleForm
        vehicle={editingVehicle}
        profile={profile}
        onCancel={() => {
          setShowAddForm(false)
          setEditingVehicle(null)
        }}
        onSuccess={handleFormSuccess}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/operations")} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Operasyon Paneline Dön
          </Button>

          <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                    <Car className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">Araç Yönetimi</CardTitle>
                    <p className="text-sm text-gray-600">Şirket araçlarını yönetin</p>
                  </div>
                </div>
                <Button onClick={handleAddVehicle} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Araç Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Plaka veya model ile ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Car className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">{vehicle.plate}</h3>
                            <p className="text-sm text-gray-600">{vehicle.model}</p>
                          </div>
                        </div>
                        <Badge variant={vehicle.is_active ? "default" : "secondary"}>
                          {vehicle.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        {vehicle.color && (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Renk:</span>
                            <span>{vehicle.color}</span>
                          </div>
                        )}
                        {vehicle.year && (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Yıl:</span>
                            <span>{vehicle.year}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Kapasite:</span>
                          <span>{vehicle.capacity} kişi</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleEditVehicle(vehicle)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredVehicles.length === 0 && (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{searchQuery ? "Araç bulunamadı" : "Henüz araç eklenmemiş"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function VehicleForm({
  vehicle,
  profile,
  onCancel,
  onSuccess,
}: {
  vehicle: Vehicle | null
  profile: any
  onCancel: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    plate: vehicle?.plate || "",
    model: vehicle?.model || "",
    color: vehicle?.color || "",
    year: vehicle?.year?.toString() || "",
    capacity: vehicle?.capacity?.toString() || "4",
    is_active: vehicle?.is_active ?? true,
    notes: vehicle?.notes || "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.plate || !formData.model) {
        throw new Error("Plaka ve model alanları zorunludur")
      }

      const vehicleData = {
        plate: formData.plate.toUpperCase(),
        model: formData.model,
        color: formData.color || null,
        year: formData.year ? Number.parseInt(formData.year) : null,
        capacity: Number.parseInt(formData.capacity),
        is_active: formData.is_active,
        notes: formData.notes || null,
      }

      if (vehicle) {
        // Update existing vehicle
        const { error } = await supabase.from("vehicles").update(vehicleData).eq("id", vehicle.id)

        if (error) throw error
      } else {
        // Create new vehicle
        const { error } = await supabase.from("vehicles").insert(vehicleData)
        if (error) throw error
      }

      onSuccess()
    } catch (err: any) {
      console.error("Error saving vehicle:", err)
      setError(err.message || "Bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Button onClick={onCancel} variant="outline" className="mb-4 bg-transparent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-blue-600" />
              <span>{vehicle ? "Aracı Düzenle" : "Yeni Araç Ekle"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Plaka *</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => handleInputChange("plate", e.target.value)}
                    placeholder="Örn: 34 ABC 123"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    placeholder="Örn: Mercedes Vito"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Renk</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange("color", e.target.value)}
                    placeholder="Örn: Beyaz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Yıl</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    placeholder="Örn: 2023"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Kapasite</Label>
                  <Select value={formData.capacity} onValueChange={(value) => handleInputChange("capacity", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(15)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} kişi
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Araç hakkında notlar..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange("is_active", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Araç aktif
                </Label>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Kaydediliyor..." : vehicle ? "Güncelle" : "Ekle"}
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
