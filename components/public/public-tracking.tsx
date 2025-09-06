"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MapPin, Car, Phone, Clock, Navigation, User, Shield, 
  RefreshCw, Locate, Route, Globe, AlertCircle, CheckCircle,
  XCircle, Truck, Calendar, Hash, UserCheck, MapIcon, Star
} from "lucide-react";
import CustomerRating from "./customer-rating";

interface PublicTrackingProps {
  trackingCode: string;
}

interface TrackingData {
  task: any;
  driver: any;
  driver_photo?: any;
  current_location?: any;
  tracking_link_id?: string;
  average_rating?: number | null;
  total_ratings?: number;
}

// Memoized translations to prevent recreation
const translations = {
  tr: {
    title: "Canlı Seyahat Takibi",
    loading: "Yükleniyor...",
    error: "Hata oluştu",
    invalidTracking: "Geçersiz takip kodu veya süresi dolmuş",
    driverInfo: "Şoför Bilgileri",
    vehicleInfo: "Araç Bilgileri",
    tripInfo: "Seyahat Bilgileri",
    from: "Başlangıç",
    to: "Varış",
    date: "Tarih",
    time: "Saat",
    phone: "Telefon",
    plate: "Plaka",
    model: "Model",
    lastUpdate: "Son Güncelleme",
    refresh: "Yenile",
    findMyLocation: "Konumumu Bul",
    contactDriver: "Şoförü Ara",
    emergency: "Acil Arama",
    customerLocation: "sizin Konumunuz",
    driverLocation: "Şoför Konumu",
    tripDetails: "Seyahat Detayları",
    customerName: "Müşteri",
    notes: "Notlar",
    status: "Durum",
    trackingCode: "Takip Kodu",
    noDriverAssigned: "Henüz şoför atanmadı",
    locationNotAvailable: "Konum bilgisi mevcut değil",
    locationUpdated: "Konum güncellendi",
    locationUpdateError: "Konum güncellenirken hata oluştu",
    locationPermissionDenied: "Konum izni verilmedi",
    locationUnavailable: "Konum servisi kullanılamıyor",
    locationTimeout: "Konum alınamadı (zaman aşımı)",
    mapLoading: "Harita yükleniyor...",
    mapError: "Harita yüklenirken hata oluştu",
    liveTracking: "Canlı Takip",
    distance: "Mesafe",
    estimatedTime: "Tahmini Süre",
    speed: "Hız",
    direction: "Yön",
    viewMap: "Haritayı Görüntüle",
    mapModalTitle: "Canlı Konum Takibi",
    rating: "Değerlendirme",
    statuses: {
      new: "Yeni Görev",
      assigned: "Şoför Atandı", 
      in_progress: "Yolda",
      completed: "Tamamlandı",
      cancelled: "İptal Edildi"
    },
    statusDescriptions: {
      new: "Görev oluşturuldu, henüz şoföre atanmadı",
      assigned: "Şoföre atandı, müşteri bekleniyor",
      in_progress: "Müşteri alındı, hedefe doğru gidiliyor",
      completed: "Seyahat başarıyla tamamlandı",
      cancelled: "Seyahat iptal edildi"
    }
  },
  en: {
    title: "Live Trip Tracking",
    loading: "Loading...",
    error: "An error occurred",
    invalidTracking: "Invalid tracking code or expired",
    driverInfo: "Driver Information",
    vehicleInfo: "Vehicle Information", 
    tripInfo: "Trip Information",
    from: "From",
    to: "To",
    date: "Date",
    time: "Time",
    phone: "Phone",
    plate: "License Plate",
    model: "Model",
    lastUpdate: "Last Update",
    refresh: "Refresh",
    findMyLocation: "Find My Location",
    contactDriver: "Call Driver",
    emergency: "Emergency Call",
    customerLocation: "Your Location",
    driverLocation: "Driver Location",
    tripDetails: "Trip Details",
    customerName: "Customer",
    notes: "Notes",
    status: "Status",
    trackingCode: "Tracking Code",
    noDriverAssigned: "No driver assigned yet",
    locationNotAvailable: "Location information not available",
    locationUpdated: "Location updated",
    locationUpdateError: "Error updating location",
    locationPermissionDenied: "Location permission denied",
    locationUnavailable: "Location service unavailable",
    locationTimeout: "Failed to get location (timeout)",
    mapLoading: "Loading map...",
    mapError: "Error loading map",
    liveTracking: "Live Tracking",
    distance: "Distance",
    estimatedTime: "Estimated Time",
    speed: "Speed",
    direction: "Direction",
    viewMap: "View Map",
    mapModalTitle: "Live Location Tracking",
    rating: "Rating",
    statuses: {
      new: "New Task",
      assigned: "Driver Assigned",
      in_progress: "On Route", 
      completed: "Completed",
      cancelled: "Cancelled"
    },
    statusDescriptions: {
      new: "Task created, not yet assigned to driver",
      assigned: "Assigned to driver, waiting for pickup",
      in_progress: "Customer picked up, heading to destination", 
      completed: "Trip completed successfully",
      cancelled: "Trip cancelled"
    }
  }
};

export default function PublicTracking({ trackingCode }: PublicTrackingProps) {
  console.log("PublicTracking component rendered with trackingCode:", trackingCode);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const locationWatchId = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mapInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leafletLoadedRef = useRef<boolean>(false);
  
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  const supabase = createClient();
  const t = translations[language];

  // Debounce function for geolocation updates
  const debounce = <F extends (...args: any[]) => void>(
    func: F,
    wait: number
  ): ((...args: Parameters<F>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<F>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Format date and time with proper locale handling
  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: '', time: '' };
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return { date: 'Geçersiz tarih', time: '' };
      }
      
      const locale = language === 'tr' ? 'tr-TR' : 'en-US';
      const dateOptions: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      };
      const timeOptions: Intl.DateTimeFormatOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      };
      
      return {
        date: date.toLocaleDateString(locale, dateOptions),
        time: date.toLocaleTimeString(locale, timeOptions)
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return { date: 'Geçersiz tarih', time: '' };
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Leaflet yükleme fonksiyonu - sadece bir kez yüklenir
  const loadLeaflet = useCallback(async () => {
    if (leafletLoadedRef.current || (window as any).L) {
      return (window as any).L;
    }

    try {
      console.log('Loading Leaflet library...');
      
      // CSS yükleme
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
        
        await new Promise((resolve) => {
          link.onload = resolve;
          setTimeout(resolve, 2000); // Fallback timeout
        });
      }
      
      // JavaScript yükleme
      const L = (await import("leaflet")).default;
      
      // Default icon fix
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      
      (window as any).L = L;
      leafletLoadedRef.current = true;
      console.log('Leaflet loaded successfully');
      
      return L;
    } catch (error) {
      console.error('Error loading Leaflet:', error);
      throw error;
    }
  }, []);

  // Harita temizleme fonksiyonu
  const cleanupMap = useCallback(() => {
    console.log('Cleaning up map...');
    
    if (mapInitTimeoutRef.current) {
      clearTimeout(mapInitTimeoutRef.current);
      mapInitTimeoutRef.current = null;
    }
    
    // Marker'ları temizle
    driverMarkerRef.current = null;
    customerMarkerRef.current = null;
    
    // Harita instance'ını temizle
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (error) {
        console.error('Error removing map instance:', error);
      }
      mapInstanceRef.current = null;
    }
    
    // Container'ı temizle
    if (mapRef.current) {
      const container = mapRef.current;
      // Leaflet ID'sini temizle
      delete (container as any)._leaflet_id;
      delete (container as any)._leaflet;
      // HTML içeriğini temizle
      container.innerHTML = '';
    }
    
    setMapReady(false);
    setMapError(null);
  }, []);

  // Harita başlatma fonksiyonu - optimize edilmiş
  const initializeMap = useCallback(async () => {
    if (typeof window === "undefined") return;
    
    console.log('Attempting to initialize map...');
    
    try {
      // Önce mevcut haritayı temizle
      cleanupMap();
      
      // DOM hazır olmasını bekle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!mapRef.current) {
        console.log('Map container not ready');
        return;
      }

      // Leaflet'i yükle
      const L = await loadLeaflet();
      
      const container = mapRef.current;
      
      // Container'a benzersiz ID ver
      if (!container.id) {
        container.id = `tracking-map-${Date.now()}`;
      }
      
      console.log('Creating map instance...');
      
      // Harita oluştur
      const map = L.map(container, {
        center: [41.0082, 28.9784], // Istanbul default
        zoom: 10,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer ekle
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
      setMapError(null);
      console.log('Map initialized successfully');

      // Size invalidation - haritanın düzgün render edilmesi için
      mapInitTimeoutRef.current = setTimeout(() => {
        if (map && map.invalidateSize) {
          map.invalidateSize();
          console.log('Map size invalidated');
        }
      }, 300);

      // Mevcut marker'ları ekle
      updateMapMarkers();
      
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError(t.mapError);
      setMapReady(false);
    }
  }, [t.mapError, cleanupMap, loadLeaflet]);

  // Marker güncelleme fonksiyonu - optimize edilmiş
  const updateMapMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !(window as any).L) return;
    
    const L = (window as any).L;
    const markers = [];
    
    try {
      // Şoför marker'ı
      if (trackingData?.current_location) {
        const location = trackingData.current_location;
        
        const driverIcon = L.divIcon({
          className: 'custom-driver-marker',
          html: `
            <div style="background: #10B981; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 14px;">
              🚗
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng([location.latitude, location.longitude]);
        } else {
          const driverName = trackingData?.driver?.full_name || 'Şoför';
          const vehiclePlate = trackingData?.driver?.vehicle_plate || '';
          const timestamp = new Date(location.timestamp).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US');

          driverMarkerRef.current = L.marker([location.latitude, location.longitude], {
            icon: driverIcon,
            title: driverName
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="min-width: 200px; font-family: system-ui;">
                <div style="font-weight: bold; color: #10B981; margin-bottom: 8px; font-size: 16px;">
                  ${driverName}
                </div>
                ${vehiclePlate ? `<div style="margin-bottom: 4px;"><span style="font-weight: 500;">🚗 Plaka:</span> ${vehiclePlate}</div>` : ''}
                <div style="margin-bottom: 4px; font-size: 12px; color: #666;">
                  📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
                </div>
                ${location.speed ? `<div style="margin-bottom: 4px; font-size: 12px;"><span style="font-weight: 500;">⚡ Hız:</span> ${location.speed.toFixed(1)} km/h</div>` : ''}
                <div style="font-size: 11px; color: #888;">
                  🕒 ${timestamp}
                </div>
              </div>
            `);
        }
        
        markers.push(driverMarkerRef.current);
      }

      // Müşteri marker'ı
      if (customerLocation) {
        const customerIcon = L.divIcon({
          className: 'custom-customer-marker',
          html: `
            <div style="background: #3B82F6; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 14px;">
              👤
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        if (customerMarkerRef.current) {
          customerMarkerRef.current.setLatLng([customerLocation.lat, customerLocation.lng]);
        } else {
          customerMarkerRef.current = L.marker([customerLocation.lat, customerLocation.lng], {
            icon: customerIcon,
            title: t.customerLocation
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="min-width: 180px; font-family: system-ui;">
                <div style="font-weight: bold; color: #3B82F6; margin-bottom: 8px; font-size: 16px;">
                  ${t.customerLocation}
                </div>
                <div style="font-size: 12px; color: #666;">
                  📍 ${customerLocation.lat.toFixed(6)}, ${customerLocation.lng.toFixed(6)}
                </div>
                <div style="font-size: 11px; color: #888; margin-top: 4px;">
                  🕒 ${new Date().toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                </div>
              </div>
            `);
        }
        
        markers.push(customerMarkerRef.current);
      }

      // Haritayı marker'lara sığdır
      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15));
      } else if (markers.length === 1) {
        const marker = markers[0];
        mapInstanceRef.current.setView(marker.getLatLng(), 15);
      }

      console.log('Map markers updated');
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, [trackingData, customerLocation, t.customerLocation, language]);

  // Get customer location with enhanced error handling
  const getCustomerLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t.locationUnavailable);
      return;
    }

    setLocationError(null);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
        console.log("Customer location retrieved:", location);
        setCustomerLocation(location);
        setLocationError(null);
        
        // Mesafe hesapla
        if (trackingData?.current_location) {
          const dist = calculateDistance(
            location.lat, 
            location.lng,
            trackingData.current_location.latitude,
            trackingData.current_location.longitude
          );
          setDistance(dist);
          const avgSpeed = 30; // km/h
          setEstimatedTime(Math.round((dist / avgSpeed) * 60)); // minutes
        }
      },
      (error) => {
        console.error("Location access error:", error);
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t.locationPermissionDenied;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t.locationUnavailable;
            break;
          case error.TIMEOUT:
            errorMessage = t.locationTimeout;
            break;
          default:
            errorMessage = t.locationUpdateError;
            break;
        }
        setLocationError(errorMessage);
      },
      options
    );
  }, [t, trackingData]);

  // Watch customer location with debouncing
  const watchCustomerLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t.locationUnavailable);
      return;
    }

    if (locationWatchId.current !== null) {
      navigator.geolocation.clearWatch(locationWatchId.current);
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    };

    const updateLocation = debounce((position: GeolocationPosition) => {
      const location = { 
        lat: position.coords.latitude, 
        lng: position.coords.longitude 
      };
      console.log("Customer location updated:", location);
      setCustomerLocation(location);
      setLocationError(null);
    }, 5000);

    locationWatchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error("Location watch error:", error);
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t.locationPermissionDenied;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t.locationUnavailable;
            break;
          case error.TIMEOUT:
            errorMessage = t.locationTimeout;
            break;
          default:
            errorMessage = t.locationUpdateError;
            break;
        }
        setLocationError(errorMessage);
      },
      options
    );
  }, [t]);

  // Load tracking data
  const loadTrackingData = useCallback(async (isRefresh = false) => {
    console.log("loadTrackingData called, isRefresh:", isRefresh);
    if (isRefresh) setRefreshLoading(true);
    else setLoading(true);
    setError(null);
    setLastUpdate(new Date());

    try {
      if (!trackingCode) {
        throw new Error(t.invalidTracking);
      }

      const { data: trackingLink, error: trackingError } = await supabase
        .from('tracking_links')
        .select(`
          *,
          tasks!inner (*)
        `)
        .eq('tracking_code', trackingCode)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (trackingError || !trackingLink) {
        throw new Error(t.invalidTracking);
      }

      let driverData = null;
      let averageRating = null;
      let totalRatings = 0;
      if (trackingLink.tasks.assigned_driver_id) {
        const { data, error: driverError } = await supabase
          .from('profiles')
          .select(`
            *,
            drivers!inner (*)
          `)
          .eq('id', trackingLink.tasks.assigned_driver_id)
          .single();

        if (driverError) {
          console.warn('Driver data not found:', driverError.message);
        } else {
          driverData = data;
          // Fetch driver ratings
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('customer_ratings')
            .select(`
              rating,
              task:tasks (
                assigned_driver_id
              )
            `)
            .eq('task.assigned_driver_id', trackingLink.tasks.assigned_driver_id);

          if (ratingsError) {
            console.error("[v0] Error fetching driver ratings:", {
              message: ratingsError.message,
              details: ratingsError.details,
              hint: ratingsError.hint,
              code: ratingsError.code,
            });
          } else if (ratingsData && ratingsData.length > 0) {
            totalRatings = ratingsData.length;
            const total = ratingsData.reduce((sum: number, rating: any) => sum + rating.rating, 0);
            averageRating = total / ratingsData.length;
          }
        }
      }

let driverPhoto = null;
if (driverData?.id) { // drivers tablosundan gelen id yerine profile id'sini kullan
  const { data: photoData, error: photoError } = await supabase
    .from('driver_photos')
    .select('photo_url')
    .eq('driver_id', driverData.id) // Bu driver'ın profile ID'si olmalı
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (photoError && photoError.code !== 'PGRST116') {
    console.warn('Driver photo fetch error:', photoError.message);
  } else if (photoData?.photo_url) {
    driverPhoto = photoData;
    console.log('Driver photo found:', photoData.photo_url);
  }
}

      let locationData = null;
      if (driverData?.id) {
        const { data: locData, error: locError } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('driver_id', driverData.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (locError && locError.code !== 'PGRST116') {
          console.error('Driver location fetch error:', locError);
        } else {
          locationData = locData;
          console.log("Driver location retrieved:", locationData);
        }
      }

      const newTrackingData = {
        task: trackingLink.tasks,
        driver: driverData ? { ...driverData, ...driverData.drivers } : null,
        driver_photo: driverPhoto,
        current_location: locationData,
        tracking_link_id: trackingLink.id,
        average_rating: averageRating,
        total_ratings: totalRatings,
      };

      console.log("Tracking data updated:", newTrackingData);
      setTrackingData(newTrackingData);

      if (trackingLink.tasks.status === 'completed') {
        const { data: existingRating } = await supabase
          .from('customer_ratings')
          .select('id')
          .eq('task_id', trackingLink.tasks.id)
          .single();

        if (!existingRating) {
          setShowRating(true);
        }
      }
    } catch (error: any) {
      console.error('Tracking data load error:', error);
      setError(error.message || t.error);
    } finally {
      if (isRefresh) setRefreshLoading(false);
      else setLoading(false);
    }
  }, [trackingCode, supabase, t]);

  // Modal açıldığında harita başlat
  useEffect(() => {
    if (isMapModalOpen && !mapReady) {
      console.log('Modal opened, initializing map...');
      // Kısa bir gecikme ile DOM'un hazır olmasını sağla
      const timeout = setTimeout(() => {
        initializeMap();
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [isMapModalOpen, mapReady, initializeMap]);

  // Marker'ları güncelle
  useEffect(() => {
    if (mapReady && isMapModalOpen) {
      updateMapMarkers();
    }
  }, [mapReady, isMapModalOpen, updateMapMarkers]);

  // Load data on mount and refresh periodically
  useEffect(() => {
    console.log("Setting up tracking data interval");
    if (trackingCode) {
      loadTrackingData();
      
      // Clear any existing interval before setting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Set up interval for periodic updates
      intervalRef.current = setInterval(() => {
        console.log("Interval triggered: calling loadTrackingData");
        loadTrackingData(true);
      }, 30000);
      
      return () => {
        console.log("Cleaning up tracking data interval");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      setLoading(false);
      setError(t.invalidTracking);
    }
  }, [trackingCode, loadTrackingData, t.invalidTracking]);

  // Get customer location on mount
  useEffect(() => {
    console.log("Initializing customer location");
    getCustomerLocation();
    watchCustomerLocation();
    
    return () => {
      console.log("Cleaning up geolocation watch");
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  }, [getCustomerLocation, watchCustomerLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up...");
      cleanupMap();
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cleanupMap]);

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      new: { icon: Hash, color: 'bg-slate-100 text-slate-700 border-slate-200', label: t.statuses.new },
      assigned: { icon: UserCheck, color: 'bg-blue-100 text-blue-700 border-blue-200', label: t.statuses.assigned },
      in_progress: { icon: Truck, color: 'bg-amber-100 text-amber-700 border-amber-200', label: t.statuses.in_progress },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200', label: t.statuses.completed },
      cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200', label: t.statuses.cancelled }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      icon: AlertCircle, 
      color: 'bg-gray-100 text-gray-700 border-gray-200', 
      label: status 
    };
    const Icon = config.icon;
    
    return (
      <Badge className={`flex items-center space-x-2 px-3 py-1 border ${config.color} font-medium`}>
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.loading}</h2>
          <p className="text-gray-500">Takip Kodu: <span className="font-mono text-blue-600">{trackingCode}</span></p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.error}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => loadTrackingData(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refresh}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <MapIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t.title}
                </h1>
                <p className="text-sm text-gray-500 font-mono">
                  {trackingCode}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                variant="outline"
                size="sm"
                className="bg-white/50 backdrop-blur-sm"
              >
                <Globe className="h-4 w-4 mr-1" />
                {language === 'tr' ? 'EN' : 'TR'}
              </Button>
              
              <Button 
                onClick={() => loadTrackingData(true)}
                variant="outline" 
                size="sm"
                disabled={refreshLoading}
                className="bg-white/50 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshLoading ? 'animate-spin' : ''}`} />
                {t.refresh}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Status Overview Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 overflow-hidden relative">
          {refreshLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {trackingData?.task?.title || 'Seyahat Takibi'}
                </h2>
                <p className="text-blue-100">
                  {t.statusDescriptions[trackingData?.task?.status as keyof typeof t.statusDescriptions] || 'Durum bilgisi mevcut değil'}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <StatusBadge status={trackingData?.task?.status || 'new'} />
                {lastUpdate && (
                  <p className="text-blue-100 text-sm mt-2">
                    {t.lastUpdate}: {lastUpdate.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trip Information */}
          <div className="space-y-6 relative">
            {refreshLoading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-xl">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
            <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <Route className="h-6 w-6 mr-3 text-blue-600" />
                  {t.tripInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 bg-green-500 rounded-full mt-1 shadow-sm"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{t.from}</p>
                      <p className="text-gray-900 font-semibold leading-relaxed">
                        {trackingData?.task?.pickup_location || 'Başlangıç noktası belirtilmemiş'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 bg-red-500 rounded-full mt-1 shadow-sm"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{t.to}</p>
                      <p className="text-gray-900 font-semibold leading-relaxed">
                        {trackingData?.task?.dropoff_location || 'Varış noktası belirtilmemiş'}
                      </p>
                    </div>
                  </div>

                  {trackingData?.task?.pickup_date && (
                    <>
                      <div className="flex items-start space-x-4">
                        <Calendar className="w-4 h-4 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">{t.date}</p>
                          <p className="text-gray-900 font-semibold">
                            {formatDateTime(trackingData.task.pickup_date).date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <Clock className="w-4 h-4 text-purple-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">{t.time}</p>
                          <p className="text-gray-900 font-semibold">
                            {formatDateTime(trackingData.task.pickup_date).time}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-start space-x-4">
                    <User className="w-4 h-4 text-indigo-500 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{t.customerName}</p>
                      <p className="text-gray-900 font-semibold">
                        {trackingData?.task?.customer_name || 'Müşteri adı belirtilmemiş'}
                      </p>
                    </div>
                  </div>

                  {trackingData?.task?.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">{t.notes}</p>
                      <p className="text-gray-800">{trackingData.task.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {(distance || estimatedTime) && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {distance && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{distance.toFixed(1)} km</p>
                        <p className="text-sm text-blue-700">{t.distance}</p>
                      </div>
                    )}
                    {estimatedTime && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{estimatedTime} dk</p>
                        <p className="text-sm text-indigo-700">{t.estimatedTime}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Driver Information - Only show if task is not completed */}
          {trackingData?.task?.status !== 'completed' && (
            <div className="space-y-6 relative">
              {refreshLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-xl">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <User className="h-6 w-6 mr-3 text-green-600" />
                    {t.driverInfo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trackingData?.driver ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-20 w-20 ring-4 ring-green-100">
  <AvatarImage 
    src={trackingData?.driver_photo?.photo_url ? `${trackingData.driver_photo.photo_url}?t=${Date.now()}` : undefined}
    alt={trackingData?.driver?.full_name}
    onError={(e) => {
      console.error('Driver avatar load error');
      e.currentTarget.style.display = 'none';
    }}
  />
  <AvatarFallback className="bg-green-100 text-green-700 text-2xl font-bold">
    {trackingData?.driver?.full_name?.charAt(0) || 'Ş'}
  </AvatarFallback>
</Avatar>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {trackingData?.driver?.full_name || 'Şoför Bilgisi Yok'}
                          </h3>
                          <p className="text-gray-600 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {trackingData?.driver?.phone || 'Telefon bilgisi yok'}
                          </p>
                          {trackingData?.average_rating !== null && (
                            <div className="flex items-center mt-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= Math.round(trackingData?.average_rating || 0)
                                        ? 'text-amber-500 fill-amber-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-medium text-amber-700 ml-2">
                                {trackingData?.average_rating?.toFixed(1)} ({trackingData?.total_ratings})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold flex items-center text-gray-800 mb-3">
                          <Car className="h-5 w-5 mr-2 text-blue-600" />
                          {t.vehicleInfo}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">{t.plate}:</span>
                            <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm">
                              {trackingData?.driver?.vehicle_plate || 'Belirsiz'}
                            </span>
                          </div>
                          {trackingData?.driver?.vehicle_model && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">{t.model}:</span>
                              <span className="font-semibold text-gray-800">
                                {trackingData.driver.vehicle_model}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <Button 
                          onClick={() => trackingData?.driver?.phone && window.open(`tel:${trackingData.driver.phone}`)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold shadow-lg"
                          disabled={!trackingData?.driver?.phone}
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          {t.contactDriver}
                        </Button>
                        <Button 
                          onClick={() => window.open('tel:112')}
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl font-semibold"
                        >
                          <Shield className="h-5 w-5 mr-2" />
                          {t.emergency} (112)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">{t.noDriverAssigned}</p>
                      <p className="text-gray-400 text-sm mt-1">Şoför ataması yapıldığında bilgiler burada görünecek</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Location Information - Only show if task is not completed */}
          {trackingData?.task?.status !== 'completed' && (
            <div className="space-y-6 relative">
              {refreshLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-xl">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Navigation className="h-6 w-6 mr-3 text-purple-600" />
                    Konum Takibi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={getCustomerLocation} 
                    className={`w-full py-3 rounded-xl font-semibold ${locationError ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'} text-white shadow-lg`}
                  >
                    <Locate className="h-5 w-5 mr-2" />
                    {t.findMyLocation}
                  </Button>
                  
                  <Button 
                    onClick={() => setIsMapModalOpen(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg"
                  >
                    <MapIcon className="h-5 w-5 mr-2" />
                    {t.viewMap}
                  </Button>
                  
                  {locationError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-yellow-700 font-medium">Konum Erişimi</p>
                          <p className="text-yellow-600 text-sm mt-1">
                            {locationError} Tarayıcı ayarlarınızdan konum erişimine izin vermeniz gerekiyor.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {showRating && trackingData && trackingData.tracking_link_id && (
          <CustomerRating
            taskId={trackingData.task.id}
            trackingLinkId={trackingData.tracking_link_id}
            driverName={trackingData.driver?.full_name || 'Şoför'}
            language={language}
            onRatingSubmitted={() => setShowRating(false)}
          />
        )}

        <Dialog 
          open={isMapModalOpen} 
          onOpenChange={(open) => {
            console.log("Map modal open change:", open);
            if (!open) {
              // Modal kapanırken haritayı temizle
              cleanupMap();
            }
            setIsMapModalOpen(open);
          }}
        >
          <DialogContent className="max-w-4xl p-0 max-h-[100vh] bg-white/55">
            <DialogHeader className="bg-gradient-to-r from-indigo-500/55 to-purple-600/55 p-4">
              <DialogTitle className="text-white text-xl flex items-center">
                <MapPin className="h-6 w-6 mr-3" />
                {t.mapModalTitle}
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative w-full h-[600px]">
              {mapError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.mapError}</h3>
                    <p className="text-gray-600 mb-4">Harita yüklenirken bir sorun oluştu</p>
                    <Button 
                      onClick={initializeMap} 
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tekrar Dene
                    </Button>
                  </div>
                </div>
              ) : !mapReady ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                  <div className="text-center">
                    <div className="relative mb-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-gray-700 font-semibold text-lg">{t.mapLoading}</p>
                    <p className="text-gray-500 text-sm mt-1">Harita yükleniyor..</p>
                  </div>
                </div>
              ) : null}
              
              <div 
                ref={mapRef} 
                className="w-full h-full"
                style={{ 
                  minHeight: '600px', 
                  display: mapReady ? 'block' : 'none' 
                }} 
              />
              
              {mapReady && (
                <>
                  <div className="absolute top-4 z-1000 left-4 bg-white/55 backdrop-blur-sm rounded-xl p-4 shadow-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3">Harita Açıklaması</h4>
                    <div className="space-y-2">
                      {customerLocation && (
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs">👤</div>
                          <span className="text-sm text-gray-700">{t.customerLocation}</span>
                        </div>
                      )}
                      {trackingData?.current_location && (
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs">🚗</div>
                          <span className="text-sm text-gray-700">{t.driverLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(!trackingData?.current_location && !customerLocation) && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-gray-700 font-medium">{t.locationNotAvailable}</p>
                          <p className="text-gray-500 text-sm mt-1">Konum bilgileri mevcut olduğunda haritada gösterilecektir.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}