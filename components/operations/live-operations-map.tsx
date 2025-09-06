"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  MapPin,
  RefreshCw,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapIcon,
  Filter,
  WifiOff,
  Loader2,
  Database,
  Wifi,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface LiveOperationsMapProps {
  profile: any
  drivers: any[]
  tasks: any[]
}

interface DriverLocation {
  id: string
  driver_id: string
  latitude: number
  longitude: number
  accuracy?: string
  heading?: string
  speed?: number
  timestamp: string
  created_at: string
}

interface DriverWithLocation extends DriverLocation {
  driver_name?: string
  vehicle_plate?: string
  vehicle_model?: string
  vehicle_color?: string
  driver_phone?: string
  is_active?: boolean
  current_task?: any
}

// Leaflet singleton with CSS loading
let leafletLoaded = false
const loadLeaflet = async () => {
  if (leafletLoaded || (window as any).L) {
    return (window as any).L
  }

  try {
    console.log("🔍 [LiveMap] Loading Leaflet library...")
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      document.head.appendChild(link)

      await new Promise((resolve, reject) => {
        link.onload = resolve
        link.onerror = reject
        setTimeout(reject, 5000)
      })
    }

    const L = (await import("leaflet")).default
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })
    ;(window as any).L = L
    leafletLoaded = true
    console.log("✅ [LiveMap] Leaflet loaded successfully")
    return L
  } catch (error) {
    console.error("❌ [LiveMap] Failed to load Leaflet:", error)
    throw new Error("Harita kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.")
  }
}

export default function LiveOperationsMap({ profile, drivers, tasks }: LiveOperationsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mapInitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [mapState, setMapState] = useState({
    loaded: false,
    initializing: false,
    error: null as string | null,
    retryCount: 0,
  })

  const [dataState, setDataState] = useState({
    loading: false,
    error: null as string | null,
    locations: [] as DriverWithLocation[],
    lastUpdate: null as Date | null,
    debugInfo: null as any,
  })

  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    selectedDriver: "all",
    showInactiveDrivers: true,
  })

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [mapCenter] = useState({ lat: 41.0082, lng: 28.9784 })
  const supabase = createClient()

  const debugLog = (message: string, data?: any) => {
    console.log(`🔍 [LiveMap] ${message}`, data ? data : "")
  }

  const cleanupMap = () => {
    if (mapRef.current) {
      const container = mapRef.current
      // Safely remove Leaflet properties
      try {
        delete (container as any)._leaflet_id
        delete (container as any)._leaflet
        container.innerHTML = ""
      } catch (error) {
        console.warn("Map cleanup warning:", error)
        // Force clear container even if cleanup fails
        container.innerHTML = ""
      }
    }
  }

  const initializeMap = useCallback(async () => {
    if (typeof window === "undefined" || !mapRef.current) {
      debugLog("Map initialization skipped: No window or container")
      return
    }

    debugLog("Starting map initialization...")
    setMapState((prev) => ({ ...prev, initializing: true, error: null }))

    try {
      cleanupMap()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const L = await loadLeaflet()
      const container = mapRef.current
      container.id = `operations-map-${Date.now()}`

      debugLog("Creating map instance...")
      const map = L.map(container, {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        maxZoom: 18,
        minZoom: 8,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
        errorTileUrl: "/placeholder-tile.png",
      }).addTo(map)

      mapInstanceRef.current = map
      setMapState((prev) => ({ ...prev, loaded: true, initializing: false, error: null }))
      debugLog("✅ Map initialized successfully")

      mapInitTimeoutRef.current = setTimeout(() => {
        if (map && map.invalidateSize) {
          map.invalidateSize()
          debugLog("Map size invalidated")
        }
      }, 300)
    } catch (error) {
      debugLog("❌ Map initialization failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Harita yüklenirken hata oluştu"
      setMapState((prev) => ({ ...prev, error: errorMessage, initializing: false, retryCount: prev.retryCount + 1 }))

      if (mapState.retryCount < 3) {
        const delay = Math.min(2000 * Math.pow(2, mapState.retryCount), 15000)
        debugLog(`Retrying map initialization in ${delay}ms (attempt ${mapState.retryCount + 2}/4)`)
        mapInitTimeoutRef.current = setTimeout(initializeMap, delay)
      }
    }
  }, [mapCenter.lat, mapCenter.lng, mapState.retryCount])

  const testDatabaseConnection = useCallback(async () => {
    try {
      debugLog("Testing database connection...")
      const { data, error } = await supabase.from("driver_locations").select("count", { count: "exact", head: true })

      if (error) {
        debugLog("Database connection error:", error)
        return { success: false, error: error.message }
      }

      debugLog("Database connection successful", { count: data })
      return { success: true, count: data }
    } catch (error) {
      debugLog("Database connection failed:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }, [supabase])

  const loadDriverLocations = useCallback(async () => {
    debugLog("Starting to load driver locations...")
    setDataState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const connectionTest = await testDatabaseConnection()
      if (!connectionTest.success) {
        throw new Error(`Veritabanı bağlantısı başarısız: ${connectionTest.error}`)
      }

      const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      debugLog("Fetching locations since:", cutoffTime)

      const { data: locations, error: locationsError } = await supabase
        .from("driver_locations")
        .select(`
          id,
          driver_id,
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          timestamp,
          created_at
        `)
        .gte("timestamp", cutoffTime)
        .order("timestamp", { ascending: false })

      debugLog("Location query result:", {
        count: locations?.length || 0,
        error: locationsError,
        sample: locations?.[0],
      })

      if (locationsError) {
        throw new Error(`Konum verileri alınamadı: ${locationsError.message}`)
      }

      if (!locations?.length) {
        debugLog("⚠️ No locations found")
        setDataState((prev) => ({
          ...prev,
          locations: [],
          loading: false,
          lastUpdate: new Date(),
          debugInfo: { message: "No recent locations found", cutoffTime },
        }))
        return
      }

      const latestLocations = new Map()
      locations.forEach((location: any) => {
        const existing = latestLocations.get(location.driver_id)
        if (!existing || new Date(location.timestamp) > new Date(existing.timestamp)) {
          latestLocations.set(location.driver_id, location)
        }
      })

      const locationArray = Array.from(latestLocations.values())
      debugLog(`Filtered to ${locationArray.length} unique drivers`)

      const driverIds = locationArray.map((loc) => loc.driver_id)
      debugLog("Fetching driver info for IDs:", driverIds)

      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select(`
          user_id,
          vehicle_plate,
          vehicle_model,
          vehicle_color,
          is_active
        `)
        .in("user_id", driverIds)

      debugLog("Driver query result:", {
        count: driversData?.length || 0,
        error: driversError,
      })

      let profilesData: any[] = []
      if (driverIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone
          `)
          .in("id", driverIds)

        if (!profilesError && profiles) {
          profilesData = profiles
        }

        debugLog("Profile query result:", {
          count: profilesData.length,
          error: profilesError,
        })
      }

      const enrichedLocations: DriverWithLocation[] = locationArray.map((location: any) => {
        const driverInfo = driversData?.find((d) => d.user_id === location.driver_id)
        const profileInfo = profilesData?.find((p) => p.id === location.driver_id)
        const currentTask = tasks?.find(
          (task) => task.assigned_driver_id === location.driver_id && ["assigned", "in_progress"].includes(task.status),
        )

        return {
          ...location,
          driver_name: profileInfo?.full_name || driverInfo?.vehicle_plate || "Bilinmeyen Şoför",
          driver_phone: profileInfo?.phone || "",
          vehicle_plate: driverInfo?.vehicle_plate || "",
          vehicle_model: driverInfo?.vehicle_model || "",
          vehicle_color: driverInfo?.vehicle_color || "",
          is_active: driverInfo?.is_active ?? true,
          current_task: currentTask,
        }
      })

      debugLog(`✅ Successfully enriched ${enrichedLocations.length} driver locations`)
      setDataState((prev) => ({
        ...prev,
        locations: enrichedLocations,
        loading: false,
        error: null,
        lastUpdate: new Date(),
        debugInfo: {
          totalLocations: locations.length,
          uniqueDrivers: locationArray.length,
          withDriverInfo: driversData?.length || 0,
          withProfiles: profilesData.length,
          enrichedCount: enrichedLocations.length,
        },
      }))
    } catch (error) {
      debugLog("❌ Error loading driver locations:", error)
      const errorMessage = error instanceof Error ? error.message : "Şoför konumları yüklenirken hata oluştu"
      setDataState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
        lastUpdate: new Date(),
        debugInfo: { error: errorMessage },
      }))
    }
  }, [supabase, tasks, testDatabaseConnection])

  const createDriverMarker = useCallback((location: DriverWithLocation) => {
    if (!(window as any).L) return null
    const L = (window as any).L

    const hasTask = !!location.current_task
    const status = location.current_task?.status || "active"

    let color = "#6b7280"
    let statusText = "Müsait"

    if (hasTask) {
      if (status === "in_progress") {
        color = "#ef4444"
        statusText = "Görevde"
      } else {
        color = "#f59e0b"
        statusText = "Atanmış"
      }
    } else if (location.is_active !== false) {
      color = "#10b981"
      statusText = "Müsait"
    } else {
      color = "#6b7280"
      statusText = "Pasif"
    }

    const icon = L.divIcon({
      className: "custom-driver-marker",
      html: `
        <div class="relative">
          <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color};">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
            </svg>
          </div>
          ${hasTask ? `<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"></div>` : ""}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })

    const popupContent = `
      <div class="p-2 w-48 max-w-xs">
        <div class="flex items-center space-x-2 mb-2">
          <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: ${color};">
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-gray-900 text-sm truncate">${location.driver_name}</h4>
            <span class="inline-block px-1.5 py-0.5 text-xs font-medium rounded text-white" style="background-color: ${color};">
              ${statusText}
            </span>
          </div>
        </div>
        <div class="space-y-1 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-600">Plaka:</span>
            <span class="font-medium">${location.vehicle_plate || "N/A"}</span>
          </div>
          ${
            location.vehicle_model
              ? `
            <div class="flex justify-between">
              <span class="text-gray-600">Araç:</span>
              <span class="font-medium truncate ml-2">${location.vehicle_model}</span>
            </div>
          `
              : ""
          }
          <div class="flex justify-between">
            <span class="text-gray-600">Tel:</span>
            <span class="font-medium">${location.driver_phone || "N/A"}</span>
          </div>
          <div class="text-gray-500 text-xs">
            ${new Date(location.timestamp).toLocaleString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
          ${
            hasTask
              ? `
            <div class="mt-2 p-1.5 bg-blue-50 rounded border-l-2 border-blue-400">
              <div class="flex items-center space-x-1 mb-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="font-medium text-blue-800 text-xs">Aktif Görev</span>
              </div>
              <div class="text-xs text-blue-700">
                <div class="font-medium truncate">${location.current_task.customer_name}</div>
                <div class="text-blue-600 truncate">${location.current_task.pickup_location}</div>
                <div class="text-blue-600 truncate">→ ${location.current_task.dropoff_location}</div>
              </div>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `

    const lat = Number.parseFloat(location.latitude.toString())
    const lng = Number.parseFloat(location.longitude.toString())

    if (isNaN(lat) || isNaN(lng)) {
      debugLog("Invalid coordinates:", { driver: location.driver_name, lat, lng })
      return null
    }

    const marker = L.marker([lat, lng], { icon }).bindPopup(popupContent)
    debugLog("Created marker for:", location.driver_name)
    return marker
  }, [])

  const updateMapMarkers = useCallback(
    async (locations: DriverWithLocation[]) => {
      if (!mapInstanceRef.current || !(window as any).L) {
        debugLog("Skipping marker update - no map instance")
        return
      }

      const L = (window as any).L
      debugLog(`Updating markers for ${locations.length} locations`)

      try {
        const newMarkers = new Map<string, any>()
        const bounds = L.latLngBounds([])
        let validMarkerCount = 0

        for (const location of locations) {
          const lat = Number.parseFloat(location.latitude.toString())
          const lng = Number.parseFloat(location.longitude.toString())

          if (isNaN(lat) || isNaN(lng)) {
            debugLog("Skipping invalid coordinates:", { driver: location.driver_name, lat, lng })
            continue
          }

          const existingMarker = markersRef.current.get(location.driver_id)

          if (existingMarker) {
            existingMarker.setLatLng([lat, lng])

            const hasTask = !!location.current_task
            const status = location.current_task?.status || "active"
            let color = location.is_active !== false ? "#10b981" : "#6b7280"
            let statusText = location.is_active !== false ? "Müsait" : "Pasif"

            if (hasTask) {
              color = status === "in_progress" ? "#ef4444" : "#f59e0b"
              statusText = status === "in_progress" ? "Görevde" : "Atanmış"
            }

            const icon = L.divIcon({
              className: "custom-driver-marker",
              html: `
              <div class="relative">
                <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color};">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                  </svg>
                </div>
                ${hasTask ? `<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"></div>` : ""}
              </div>
            `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })

            const popupContent = `
            <div class="p-2 w-48 max-w-xs">
              <div class="flex items-center space-x-2 mb-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: ${color};">
                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-gray-900 text-sm truncate">${location.driver_name}</h4>
                  <span class="inline-block px-1.5 py-0.5 text-xs font-medium rounded text-white" style="background-color: ${color};">
                    ${statusText}
                  </span>
                </div>
              </div>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between">
                  <span class="text-gray-600">Plaka:</span>
                  <span class="font-medium">${location.vehicle_plate || "N/A"}</span>
                </div>
                ${
                  location.vehicle_model
                    ? `
                  <div class="flex justify-between">
                    <span class="text-gray-600">Araç:</span>
                    <span class="font-medium truncate ml-2">${location.vehicle_model}</span>
                  </div>
                `
                    : ""
                }
                <div class="flex justify-between">
                  <span class="text-gray-600">Tel:</span>
                  <span class="font-medium">${location.driver_phone || "N/A"}</span>
                </div>
                <div class="text-gray-500 text-xs">
                  ${new Date(location.timestamp).toLocaleString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </div>
                ${
                  hasTask
                    ? `
                  <div class="mt-2 p-1.5 bg-blue-50 rounded border-l-2 border-blue-400">
                    <div class="flex items-center space-x-1 mb-1">
                      <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span class="font-medium text-blue-800 text-xs">Aktif Görev</span>
                    </div>
                    <div class="text-xs text-blue-700">
                      <div class="font-medium truncate">${location.current_task.customer_name}</div>
                      <div class="text-blue-600 truncate">${location.current_task.pickup_location}</div>
                      <div class="text-blue-600 truncate">→ ${location.current_task.dropoff_location}</div>
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `

            existingMarker.setIcon(icon)
            existingMarker.setPopupContent(popupContent)
            newMarkers.set(location.driver_id, existingMarker)
            bounds.extend([lat, lng])
            validMarkerCount++
          } else {
            const marker = createDriverMarker(location)
            if (marker && mapInstanceRef.current) {
              marker.addTo(mapInstanceRef.current)
              newMarkers.set(location.driver_id, marker)
              bounds.extend([lat, lng])
              validMarkerCount++
            }
          }
        }

        markersRef.current.forEach((marker, driverId) => {
          if (!newMarkers.has(driverId)) {
            try {
              mapInstanceRef.current.removeLayer(marker)
            } catch (error) {
              debugLog("Error removing marker:", error)
            }
          }
        })

        markersRef.current = newMarkers
        debugLog(`✅ Updated ${validMarkerCount} markers`)

        if (validMarkerCount > 0 && validMarkerCount <= 50 && bounds.isValid()) {
          try {
            mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 })
          } catch (error) {
            debugLog("Error fitting bounds:", error)
          }
        }
      } catch (error) {
        debugLog("❌ Error updating markers:", error)
      }
    },
    [createDriverMarker],
  )

  const filteredLocations = useMemo(() => {
    let filtered = dataState.locations

    if (!settings.showInactiveDrivers) {
      filtered = filtered.filter((loc) => loc.is_active !== false)
    }

    if (settings.selectedDriver !== "all") {
      filtered = filtered.filter((loc) => loc.driver_id === settings.selectedDriver)
    }

    debugLog("Filtered locations:", {
      total: dataState.locations.length,
      filtered: filtered.length,
      showInactive: settings.showInactiveDrivers,
      selectedDriver: settings.selectedDriver,
    })

    return filtered
  }, [dataState.locations, settings.showInactiveDrivers, settings.selectedDriver])

  const driverStats = useMemo(() => {
    const activeDrivers = dataState.locations.filter((d) => d.is_active !== false)
    const driversWithTasks = activeDrivers.filter((d) => d.current_task)
    const driversOnline = dataState.locations.length

    return {
      activeDrivers: activeDrivers.length,
      driversWithTasks: driversWithTasks.length,
      driversOnline,
    }
  }, [dataState.locations])

  useEffect(() => {
    if (settings.autoRefresh && mapState.loaded && !dataState.loading) {
      debugLog(`Setting up auto-refresh every ${settings.refreshInterval}s`)
      intervalRef.current = setInterval(() => {
        debugLog("Auto-refresh triggered")
        loadDriverLocations()
      }, settings.refreshInterval * 1000)
    } else if (intervalRef.current) {
      debugLog("Clearing auto-refresh interval")
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [settings.autoRefresh, settings.refreshInterval, mapState.loaded, dataState.loading, loadDriverLocations])

  useEffect(() => {
    debugLog("Component mounted, initializing map...")
    initializeMap()

    return () => {
      debugLog("Component unmounting...")
      cleanupMap()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [initializeMap])

  useEffect(() => {
    if (mapState.loaded) {
      updateMapMarkers(filteredLocations)
    }
  }, [mapState.loaded, filteredLocations, updateMapMarkers])

  useEffect(() => {
    if (mapState.loaded) {
      debugLog("Map loaded, fetching initial data...")
      loadDriverLocations()
    }
  }, [mapState.loaded, loadDriverLocations])

  const handleRefresh = useCallback(() => {
    if (!dataState.loading) {
      debugLog("Manual refresh triggered")
      loadDriverLocations()
    }
  }, [dataState.loading, loadDriverLocations])

  const handleRetryMap = useCallback(() => {
    debugLog("Map retry triggered")
    setMapState((prev) => ({ ...prev, error: null, retryCount: 0 }))
    initializeMap()
  }, [initializeMap])

  return (
    <div className="space-y-6 p-6">
      <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                <MapIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Canlı Operasyon Haritası</CardTitle>
                <p className="text-sm text-gray-600">
                  Şoförlerin gerçek zamanlı konum takibi
                  {dataState.lastUpdate && (
                    <span className="ml-2 text-xs text-blue-600">
                      Son güncelleme: {dataState.lastUpdate.toLocaleTimeString("tr-TR")}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRefresh}
                disabled={dataState.loading}
                variant="outline"
                size="sm"
                className="border-blue-200 hover:bg-blue-50 transition-colors bg-transparent"
              >
                {dataState.loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Yenile
              </Button>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoRefresh: checked }))}
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">Otomatik</span>
              </div>
              <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 hover:bg-blue-50 transition-colors bg-transparent"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtreler
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Filter className="h-5 w-5 text-slate-600" />
                      <span>Filtreler & Ayarlar</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Şoför Seçimi</label>
                      <Select
                        value={settings.selectedDriver}
                        onValueChange={(value) => setSettings((prev) => ({ ...prev, selectedDriver: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">🚛 Tüm Şoförler</SelectItem>
                          {drivers?.map((driver: any) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.full_name} - {(driver.driver_info || driver)?.vehicle_plate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <label className="text-sm font-medium text-slate-700">Pasif Şoförleri Göster</label>
                      <Switch
                        checked={settings.showInactiveDrivers}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({ ...prev, showInactiveDrivers: checked }))
                        }
                      />
                    </div>
                    {settings.autoRefresh && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Yenileme Aralığı</label>
                        <Select
                          value={settings.refreshInterval.toString()}
                          onValueChange={(value) =>
                            setSettings((prev) => ({ ...prev, refreshInterval: Number(value) }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">⚡ 1 saniye</SelectItem>
                            <SelectItem value="15">⚡ 15 saniye</SelectItem>
                            <SelectItem value="30">🔄 30 saniye</SelectItem>
                            <SelectItem value="60">⏱️ 1 dakika</SelectItem>
                            <SelectItem value="300">⏰ 5 dakika</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-xl border-0 bg-white rounded-xl overflow-hidden relative">
        <CardContent className="p-0">
          <div className="relative">
            <div
              ref={mapRef}
              className="w-full h-80 md:h-[400px] lg:h-[450px] xl:h-[500px]"
              style={{ minHeight: "350px" }}
            />
            <div className="absolute top-4 left-4 flex space-x-2" style={{ zIndex: 1001 }}>
              <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-3 py-1.5 text-center backdrop-blur-sm">
                <Database className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-blue-600">{driverStats.driversOnline}</p>
                <p className="text-xs text-blue-600">Çevrimiçi</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg px-3 py-1.5 text-center backdrop-blur-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-green-600">{driverStats.activeDrivers}</p>
                <p className="text-xs text-green-600">Aktif</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-lg px-3 py-1.5 text-center backdrop-blur-sm">
                <Car className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-orange-600">{driverStats.driversWithTasks}</p>
                <p className="text-xs text-orange-600">Görevde</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg shadow-lg px-3 py-1.5 text-center backdrop-blur-sm">
                <MapPin className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-purple-600">{filteredLocations.length}</p>
                <p className="text-xs text-purple-600">Görünür</p>
              </div>
            </div>
            {(!mapState.loaded || mapState.initializing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-10">
                <div className="text-center p-8">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-blue-400 mx-auto"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    {mapState.initializing ? "Harita Başlatılıyor..." : "Harita Yükleniyor..."}
                  </h3>
                  <p className="text-sm text-blue-600">Leaflet kütüphanesi ve CSS dosyaları yükleniyor</p>
                  {mapState.retryCount > 0 && (
                    <p className="text-xs text-blue-500 mt-2">Deneme {mapState.retryCount + 1}/4</p>
                  )}
                </div>
              </div>
            )}
            {dataState.loading && mapState.loaded && (
              <div className="absolute top-4 left-[calc(4rem+4*6rem)] z-20">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-700">Konumlar güncelleniyor...</span>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute top-4 right-4 z-20">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm ${
                  settings.autoRefresh && mapState.loaded && !dataState.error
                    ? "bg-green-100/90 text-green-800 border border-green-200"
                    : dataState.error
                      ? "bg-red-100/90 text-red-800 border border-red-200"
                      : "bg-gray-100/90 text-gray-800 border border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-1">
                  {settings.autoRefresh && mapState.loaded && !dataState.error ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <Wifi className="w-3 h-3" />
                      <span>Canlı</span>
                    </>
                  ) : dataState.error ? (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>Hata</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      <span>Kapalı</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {mapState.loaded && (
              <div className="absolute bottom-4 left-4 z-20">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">
                        {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {dataState.locations.length > 0 && (
                      <>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center space-x-1">
                          <Database className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">{dataState.locations.length} kayıt</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            {process.env.NODE_ENV === "development" && dataState.debugInfo && (
              <div className="absolute bottom-4 right-4 z-20">
                <div className="bg-black/80 text-white text-xs p-3 rounded-lg max-w-xs">
                  <h5 className="font-bold mb-1">🔧 Debug Info:</h5>
                  <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                    {JSON.stringify(dataState.debugInfo, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(dataState.error || mapState.error) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800 mb-1">Hata Oluştu</h4>
                <p className="text-sm text-red-700 mb-2">{dataState.error || mapState.error}</p>
                <div className="flex gap-2">
                  {mapState.error && (
                    <Button
                      onClick={handleRetryMap}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
                    >
                      🔄 Haritayı Tekrar Dene
                    </Button>
                  )}
                  {dataState.error && (
                    <Button
                      onClick={handleRefresh}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
                      disabled={dataState.loading}
                    >
                      🔄 Verileri Yenile
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!dataState.loading && !dataState.error && dataState.locations.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Konum Verisi Bulunamadı</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Son 2 saatte hiçbir şoför konumu kaydedilmemiş. Şoförler mobil uygulamayı kullanarak konum paylaşımını
                  aktif etmelidir.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-600 rounded-lg">
              <MapIcon className="h-5 w-5 text-white" />
            </div>
            <h4 className="font-bold text-gray-800">Harita Rehberi & Durum Göstergeleri</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Müsait</p>
                <p className="text-xs text-gray-600">Görev bekliyor</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <div className="w-3 h-3 bg-blue-500 rounded-full absolute -top-1 -right-1 border border-white"></div>
              </div>
              <div>
                <p className="font-medium text-gray-800">Atanmış</p>
                <p className="text-xs text-gray-600">Göreve gidiyor</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <div className="w-3 h-3 bg-blue-500 rounded-full absolute -top-1 -right-1 border border-white"></div>
              </div>
              <div>
                <p className="font-medium text-gray-800">Görevde</p>
                <p className="text-xs text-gray-600">Aktif çalışıyor</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border">
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Pasif</p>
                <p className="text-xs text-gray-600">Çevrimdışı</p>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-800 flex items-center gap-2">💡 Kullanım İpuçları:</h5>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Marker'lara tıklayarak şoför detaylarını görün</li>
                <li>• Haritayı yakınlaştırıp uzaklaştırabilirsiniz</li>
                <li>• Otomatik yenileme ile canlı takip yapın</li>
                <li>• Filtreleri kullanarak görünümü özelleştirin</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-gray-800 flex items-center gap-2">📊 Veri Bilgileri:</h5>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Son 2 saatlik konum verileri gösterilir</li>
                <li>• Konum hassasiyeti GPS'e bağlıdır</li>
                <li>• Hız bilgisi kilometre/saat cinsindendir</li>
                <li>• Zaman damgaları yerel saat dilimindendir</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-gray-800 flex items-center gap-2">🔧 Sorun Giderme:</h5>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Harita yüklenmiyorsa sayfayı yenileyin</li>
                <li>• Konum görünmüyorsa şoför uygulamasını kontrol edin</li>
                <li>• Yavaş bağlantıda otomatik yenilemeyi kapatın</li>
                <li>• Hata durumunda "Tekrar Dene" butonunu kullanın</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
