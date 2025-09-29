"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, MapPin } from "lucide-react";

interface TaskEditModalProps {
  task: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function TaskEditModal({ task, onClose, onSuccess }: TaskEditModalProps) {
  const [formData, setFormData] = useState({
    title: task.title || "",
    pickupLocation: task.pickup_location || "",
    dropoffLocation: task.dropoff_location || "",
    pickupDate: task.pickup_date || "",
    pickupTime: task.pickup_time || "",
    customerName: task.customer_name || "",
    customerPhone: task.customer_phone || "",
    customerNotes: task.customer_notes || "",
    status: task.status || "new",
    pickupCoordinates: task.pickup_coordinates || "",
    dropoffCoordinates: task.dropoff_coordinates || "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<AddressSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);
  
  const pickupRef = useRef<HTMLDivElement>(null);
  const dropoffRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Click outside handler for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) {
        setShowPickupSuggestions(false);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target as Node)) {
        setShowDropoffSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search addresses using OpenStreetMap Nominatim
  const searchAddress = async (query: string, isPickup: boolean): Promise<AddressSuggestion[]> => {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      if (isPickup) {
        setIsSearchingPickup(true);
      } else {
        setIsSearchingDropoff(true);
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=tr`
      );
      
      if (!response.ok) {
        throw new Error('Adres arama başarısız');
      }

      const data = await response.json();
      return data.map((item: any) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon
      }));
    } catch (error) {
      console.error('Adres arama hatası:', error);
      return [];
    } finally {
      if (isPickup) {
        setIsSearchingPickup(false);
      } else {
        setIsSearchingDropoff(false);
      }
    }
  };

  // Handle pickup address input with debouncing
  const handlePickupAddressChange = async (value: string) => {
    handleInputChange("pickupLocation", value);
    
    // Eğer adres değiştiyse koordinatları sıfırla
    if (value !== task.pickup_location) {
      handleInputChange("pickupCoordinates", "");
    }
    
    if (value.length >= 3) {
      const suggestions = await searchAddress(value, true);
      setPickupSuggestions(suggestions);
      setShowPickupSuggestions(true);
    } else {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
    }
  };

  // Handle dropoff address input with debouncing
  const handleDropoffAddressChange = async (value: string) => {
    handleInputChange("dropoffLocation", value);
    
    // Eğer adres değiştiyse koordinatları sıfırla
    if (value !== task.dropoff_location) {
      handleInputChange("dropoffCoordinates", "");
    }
    
    if (value.length >= 3) {
      const suggestions = await searchAddress(value, false);
      setDropoffSuggestions(suggestions);
      setShowDropoffSuggestions(true);
    } else {
      setDropoffSuggestions([]);
      setShowDropoffSuggestions(false);
    }
  };

  // Select pickup address from suggestions
  const handlePickupAddressSelect = (suggestion: AddressSuggestion) => {
    handleInputChange("pickupLocation", suggestion.display_name);
    handleInputChange("pickupCoordinates", `${suggestion.lat},${suggestion.lon}`);
    setShowPickupSuggestions(false);
    setPickupSuggestions([]);
  };

  // Select dropoff address from suggestions
  const handleDropoffAddressSelect = (suggestion: AddressSuggestion) => {
    handleInputChange("dropoffLocation", suggestion.display_name);
    handleInputChange("dropoffCoordinates", `${suggestion.lat},${suggestion.lon}`);
    setShowDropoffSuggestions(false);
    setDropoffSuggestions([]);
  };

  const handleInputChange = (field: string, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Format coordinates for database
  const formatCoordinates = (coords: string) => {
    if (!coords) return null;
    const [lat, lon] = coords.split(',').map(c => c.trim());
    return `(${lat},${lon})`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validations
      if (!formData.title || !formData.pickupLocation || !formData.dropoffLocation || !formData.pickupDate || !formData.customerName || !formData.customerPhone) {
        throw new Error('Lütfen tüm gerekli alanları doldurun');
      }

      const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(formData.customerPhone)) {
        throw new Error('Geçerli bir telefon numarası girin');
      }

      const updateData = {
        title: formData.title,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_notes: formData.customerNotes || null,
        status: formData.status,
        // Koordinatları güncelle - eğer değiştiyse
        pickup_coordinates: formData.pickupCoordinates ? formatCoordinates(formData.pickupCoordinates) : task.pickup_coordinates,
        dropoff_coordinates: formData.dropoffCoordinates ? formatCoordinates(formData.dropoffCoordinates) : task.dropoff_coordinates,
        updated_at: new Date().toISOString(),
      };

      console.log("[TaskEditModal] Updating task data:", JSON.stringify(updateData, null, 2));

      const { error } = await supabase.from("tasks").update(updateData).eq("id", task.id);

      if (error) throw error;

      onSuccess();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Koordinat formatını düzgün göster
  const formatCoordinateDisplay = (coord: string) => {
    if (!coord) return "Koordinat yok";
    // (41.0082,28.9784) formatını düzgün göster
    const cleanCoord = coord.replace(/[()]/g, '');
    return cleanCoord || "Koordinat yok";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-blue-600" />
            <span>Görevi Düzenle</span>
          </DialogTitle>
        </DialogHeader>

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

          {/* Adres Alanları - Otomatik Tamamlama ile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative" ref={pickupRef}>
              <Label htmlFor="pickupLocation">Alış Konumu *</Label>
              <div className="relative">
                <Input
                  id="pickupLocation"
                  type="text"
                  required
                  value={formData.pickupLocation}
                  onChange={(e) => handlePickupAddressChange(e.target.value)}
                  onFocus={() => {
                    if (pickupSuggestions.length > 0) {
                      setShowPickupSuggestions(true);
                    }
                  }}
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
              
              {/* Mevcut koordinat bilgisi */}
              {formData.pickupCoordinates && (
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Mevcut koordinat:</span> {formatCoordinateDisplay(formData.pickupCoordinates)}
                </div>
              )}
            </div>

            <div className="space-y-2 relative" ref={dropoffRef}>
              <Label htmlFor="dropoffLocation">Bırakış Konumu *</Label>
              <div className="relative">
                <Input
                  id="dropoffLocation"
                  type="text"
                  required
                  value={formData.dropoffLocation}
                  onChange={(e) => handleDropoffAddressChange(e.target.value)}
                  onFocus={() => {
                    if (dropoffSuggestions.length > 0) {
                      setShowDropoffSuggestions(true);
                    }
                  }}
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
              
              {/* Mevcut koordinat bilgisi */}
              {formData.dropoffCoordinates && (
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Mevcut koordinat:</span> {formatCoordinateDisplay(formData.dropoffCoordinates)}
                </div>
              )}
            </div>
          </div>

          {/* Gizli koordinat alanları */}
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
            <Label htmlFor="customerNotes">Müşteri Notları</Label>
            <Textarea
              id="customerNotes"
              value={formData.customerNotes}
              onChange={(e) => handleInputChange("customerNotes", e.target.value)}
              rows={3}
            />
          </div>

          {/* Koordinat Değişiklik Bilgisi */}
          {(formData.pickupCoordinates && formData.pickupCoordinates !== task.pickup_coordinates) ||
           (formData.dropoffCoordinates && formData.dropoffCoordinates !== task.dropoff_coordinates) ? (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
              <strong>Koordinat Güncellemesi:</strong> Adres değişikliği yapıldığı için koordinatlar yenilenecek.
            </div>
          ) : null}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Güncelleniyor..." : "Görevi Güncelle"}
            </Button>
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              İptal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
