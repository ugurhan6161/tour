"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Phone, Car, User, CheckCircle, XCircle, Edit, Trash2, Users, Search, Star } from "lucide-react"

// Driver Ratings Summary Component
const DriverRatingsSummary = ({ driverId, supabase }: { driverId: string; supabase: any }) => {
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [totalRatings, setTotalRatings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRatingsSummary = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("customer_ratings")
          .select(`
            rating,
            task:tasks (
              assigned_driver_id
            )
          `)
          .eq("task.assigned_driver_id", driverId)

        if (error) throw error

        if (data && data.length > 0) {
          const total = data.reduce((sum: number, rating: any) => sum + rating.rating, 0)
          setAverageRating(total / data.length)
          setTotalRatings(data.length)
        } else {
          setAverageRating(null)
          setTotalRatings(0)
        }
      } catch (error) {
        console.error("[v0] Error fetching ratings summary:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchRatingsSummary()
  }, [driverId, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-6 mt-1">
        <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (totalRatings === 0) {
    return <p className="text-xs text-gray-500 mt-1">Henüz değerlendirme yok</p>
  }

  return (
    <div className="flex items-center mt-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= Math.round(averageRating || 0) ? "text-amber-500 fill-amber-500" : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-amber-700 ml-1">
        {averageRating?.toFixed(1)} ({totalRatings})
      </span>
    </div>
  )
}

interface DriversManagementProps {
  drivers: any[]
  onDriverUpdate: () => void
}

export default function DriversManagement({ drivers, onDriverUpdate }: DriversManagementProps) {
  const [editingDriver, setEditingDriver] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    vehicle_plate: "",
    license_number: "",
    is_active: true,
  })
  const [selectedDriver, setSelectedDriver] = useState<any>(null)
  const [isRatingsModalOpen, setIsRatingsModalOpen] = useState(false)
  const [driverRatings, setDriverRatings] = useState<any[]>([])
  const [loadingRatings, setLoadingRatings] = useState(false)
  const supabase = createClient()

  // Fetch driver ratings
  const fetchDriverRatings = async (driverId: string) => {
    try {
      setLoadingRatings(true)
      const { data, error } = await supabase
        .from("customer_ratings")
        .select(`
          id,
          rating,
          review_text,
          customer_name,
          created_at,
          task:tasks (
            pickup_location,
            dropoff_location,
            pickup_date
          )
        `)
        .eq("task.assigned_driver_id", driverId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedRatings = (data || []).map((rating: any) => ({
        ...rating,
        task:
          rating.task && Array.isArray(rating.task) && rating.task.length > 0 ? rating.task[0] : rating.task || null,
      }))

      setDriverRatings(formattedRatings)
      setSelectedDriver(driverId)
      setIsRatingsModalOpen(true)
    } catch (error) {
      console.error("[v0] Error fetching driver ratings:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    } finally {
      setLoadingRatings(false)
    }
  }

  console.log("[v0] Drivers data structure:", JSON.stringify(drivers, null, 2))

  const handleEdit = (driver: any) => {
    console.log("[v0] Editing driver:", JSON.stringify(driver, null, 2))

    setEditingDriver(driver)
    setFormData({
      full_name: driver.full_name || "",
      phone: driver.phone || "",
      vehicle_plate: driver.vehicle_plate || "",
      license_number: driver.license_number || "",
      is_active: driver.is_active ?? true,
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
        .eq("id", editingDriver.user_id)

      if (profileError) throw profileError

      // Update driver info
      const { error: driverError } = await supabase
        .from("drivers")
        .update({
          vehicle_plate: formData.vehicle_plate,
          license_number: formData.license_number,
          is_active: formData.is_active,
        })
        .eq("user_id", editingDriver.user_id)

      if (driverError) throw driverError

      setIsDialogOpen(false)
      setEditingDriver(null)
      onDriverUpdate()
    } catch (error) {
      console.error("Error updating driver:", error)
    }
  }

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      searchQuery === "" ||
      driver.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const activeDriversCount = drivers.filter((driver) => driver.is_active === true).length
  const inactiveDriversCount = drivers.length - activeDriversCount

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500 rounded-lg shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{drivers.length}</p>
                <p className="text-sm font-medium text-blue-700">Toplam Şoför</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500 rounded-lg shadow-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeDriversCount}</p>
                <p className="text-sm font-medium text-green-700">Aktif Şoför</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-500 rounded-lg shadow-lg">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{inactiveDriversCount}</p>
                <p className="text-sm font-medium text-red-700">Pasif Şoför</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <Users className="h-5 w-5 text-gray-600" />
              <span>Şoför Yönetimi</span>
            </CardTitle>

            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Şoför ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-lg border-2 border-gray-200 focus:border-blue-400 bg-white/80"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => {
              const vehiclePlate = driver.vehicle_plate || "Araç yok"
              const isActive = driver.is_active ?? true
              const licenseNumber = driver.license_number

              return (
                <Card
                  key={driver.user_id}
                  className="shadow-lg border-0 bg-white rounded-xl overflow-hidden group hover:scale-105 transition-transform duration-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12 ring-2 ring-blue-100">
                          {driver.driver_photos?.[0]?.photo_url ? (
                            <AvatarImage
                              src={`${driver.driver_photos[0].photo_url}?t=${Date.now()}`}
                              alt={driver.full_name}
                              className="object-cover"
                              onError={(e) => {
                                console.error("Avatar image load error for driver:", driver.user_id)
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold">
                              {driver.full_name?.charAt(0) || "Ş"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-sm">{driver.full_name}</h3>
                          <Badge
                            className={`text-xs mt-1 ${
                              isActive
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Pasif
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Telefon</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 font-medium">{driver.phone || "Telefon yok"}</p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">Araç Plakası</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 font-medium">{vehiclePlate}</p>
                      </div>

                      {licenseNumber && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Ehliyet No</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1 font-medium">{licenseNumber}</p>
                        </div>
                      )}

                      {/* Ratings Summary */}
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-amber-600 fill-amber-600" />
                            <span className="text-sm font-medium text-amber-800">Değerlendirme</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 border-amber-200 text-amber-700 hover:bg-amber-50 bg-transparent"
                            onClick={() => fetchDriverRatings(driver.user_id)}
                          >
                            Detay
                          </Button>
                        </div>
                        <DriverRatingsSummary driverId={driver.user_id} supabase={supabase} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <Button
                        onClick={() => handleEdit(driver)}
                        size="sm"
                        variant="outline"
                        className="flex items-center space-x-2 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Düzenle</span>
                      </Button>
                      <Button
                        onClick={() => handleDelete(driver.user_id)}
                        size="sm"
                        variant="outline"
                        className="flex items-center space-x-2 border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
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

          {filteredDrivers.length === 0 && (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {searchQuery ? "Arama sonucu bulunamadı" : "Şoför bulunamadı"}
              </h3>
              <p className="text-gray-600">
                {searchQuery ? `"${searchQuery}" için arama sonucu bulunamadı.` : "Henüz kayıtlı şoför bulunmuyor."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ratings Detail Modal */}
      <Dialog open={isRatingsModalOpen} onOpenChange={setIsRatingsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center space-x-2 text-gray-800">
              <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
              <span>Şoför Değerlendirmeleri</span>
            </DialogTitle>
          </DialogHeader>

          {loadingRatings ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {driverRatings.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz değerlendirme yok</h3>
                  <p className="text-gray-500">Bu şoför için henüz müşteri değerlendirmesi yapılmadı.</p>
                </div>
              ) : (
                driverRatings.map((rating) => (
                  <Card key={rating.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= rating.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{rating.rating}/5</span>
                          </div>
                          {rating.customer_name && (
                            <p className="text-sm font-medium text-gray-700">{rating.customer_name}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(rating.created_at).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                      </div>
                      {rating.review_text && (
                        <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded-lg">{rating.review_text}</p>
                      )}
                      {rating.task && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            {new Date(rating.task.pickup_date).toLocaleDateString("tr-TR")} -{" "}
                            {rating.task.pickup_location} → {rating.task.dropoff_location}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md mx-auto rounded-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center space-x-2 text-gray-800">
              <Edit className="h-5 w-5 text-blue-600" />
              <span>Şoför Bilgilerini Düzenle</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700">
                Ad Soyad
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                required
                className="rounded-lg border-2 border-gray-200 focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                Telefon
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="rounded-lg border-2 border-gray-200 focus:border-blue-400"
                placeholder="0555 123 45 67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_plate" className="text-sm font-semibold text-gray-700">
                Araç Plakası
              </Label>
              <Input
                id="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_plate: e.target.value }))}
                placeholder="34 ABC 123"
                className="rounded-lg border-2 border-gray-200 focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_number" className="text-sm font-semibold text-gray-700">
                Ehliyet Numarası
              </Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, license_number: e.target.value }))}
                placeholder="Ehliyet numarasını girin"
                className="rounded-lg border-2 border-gray-200 focus:border-blue-400"
              />
            </div>

            <div className="flex space-x-2 pt-6 border-t">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Kaydet
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50"
              >
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
