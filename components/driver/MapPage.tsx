// components/MapPage.tsx
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, RefreshCw, Plus, Save, Trash2, Loader2, Map as MapIcon } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

// Supabase istemcisini oluştur
const supabase = createClient();

interface MapPageProps {
  locations: any[];
  setLocations: (locations: any[]) => void;
  profile: any;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export default function MapPage({
  locations,
  setLocations,
  profile,
  loading,
  setLoading,
  setError
}: MapPageProps) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isAddLocationMode, setIsAddLocationMode] = useState(false);
  const [newLocationModal, setNewLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: "", notes: "", latitude: 0, longitude: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [initializingMap, setInitializingMap] = useState(false);
  const isAddLocationModeRef = useRef(isAddLocationMode);
  const markersRef = useRef<any[]>([]);

  // Ref'i güncelle
  useEffect(() => {
    isAddLocationModeRef.current = isAddLocationMode;
  }, [isAddLocationMode]);

  const handleMapClick = useCallback((e: any) => {
    if (isAddLocationModeRef.current && e.latlng) {
      setLocationForm(prev => ({
        ...prev,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      }));
      setNewLocationModal(true);
      setIsAddLocationMode(false);
    }
  }, []); // Remove dependencies to prevent useCallback recreation

  const initializeMap = useCallback(async () => {
    // Prevent multiple initializations with stricter checks
    if (typeof window === "undefined" || !mapRef.current || mapInstanceRef.current || initializingMap) {
      return; // Exit early if conditions aren't met
    }

    setInitializingMap(true);

    try {
      const container = mapRef.current;
      
      // Force unique container ID for driver map
      if (!container.id) {
        container.id = `driver-map-page-${Date.now()}`;
      }
      
      // Check for existing Leaflet data more thoroughly
      if ((container as any)._leaflet_id || (container as any)._leaflet) {
        console.log('MapPage: Container already initialized with Leaflet ID:', (container as any)._leaflet_id);
        setInitializingMap(false);
        return;
      }

      // Clear any existing content carefully to prevent React conflicts
      if (container.innerHTML && container.innerHTML.trim() !== '') {
        console.log('MapPage: Container has content, checking if safe to clear');
        // Only clear if container doesn't have React-managed content
        if (!container.querySelector('[data-reactroot]') && !container.querySelector('[data-react-]')) {
          console.log('MapPage: Clearing non-React container content');
          container.innerHTML = '';
        } else {
          console.log('MapPage: Container has React content, skipping clear');
        }
      }
      
      const L = (await import("leaflet")).default;
      
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create map with unique container reference
      const map = L.map(container, {
        zoomControl: true,
        attributionControl: true
      }).setView([41.0, 39.72], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);

      map.on('click', handleMapClick);
      
      console.log('MapPage: Map initialized successfully with container ID:', container.id);
    } catch (error) {
      console.error("MapPage initialization error:", error);
      setError("Harita yüklenirken hata oluştu");
      // Reset mapInstanceRef on error
      mapInstanceRef.current = null;
      setMapLoaded(false);
    } finally {
      setInitializingMap(false);
    }
  }, []); // Remove all dependencies to prevent re-creation

  const updateMapMarkers = useCallback((map: any, locations: any[], L: any) => {
    // Safety check: ensure map is valid and not destroyed
    if (!map || !map.getContainer || !map.getContainer()) {
      console.warn('Map instance is invalid or destroyed, skipping marker update');
      return;
    }

    try {
      // Önceki tüm marker'ları temizle
      markersRef.current.forEach(marker => {
        try {
          if (marker && map.hasLayer && map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
      markersRef.current = [];

      // Yeni marker'ları ekle
      locations.forEach(location => {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        
        // Only create marker if coordinates are valid numbers and map is valid
        if (!isNaN(lat) && !isNaN(lng) && map && map.getContainer && map.getContainer()) {
          try {
            const marker = L.marker([lat, lng])
              .addTo(map)
              .bindPopup(`<strong>${location.name}</strong><br/>${location.notes || 'Not yok'}`);
            
            markersRef.current.push(marker);
          } catch (error) {
            console.warn('Error creating marker:', error);
          }
        }
      });
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      if (!profile?.id) {
        console.log('MapPage: No profile available, skipping location load');
        setLocations([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('driverlocations')
        .select('*')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('MapPage: Supabase error loading locations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Handle empty table gracefully
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('MapPage: Driver locations table appears to be empty or not exist, setting empty locations');
          setLocations([]);
          return;
        }
        
        throw error;
      }
      
      setLocations(data || []);
      console.log(`MapPage: Loaded ${(data || []).length} saved locations`);
      
      if (mapInstanceRef.current && data && data.length > 0) {
        // Safety check before updating markers
        if (mapInstanceRef.current.getContainer && mapInstanceRef.current.getContainer()) {
          try {
            const L = (await import("leaflet")).default;
            updateMapMarkers(mapInstanceRef.current, data, L);
          } catch (error) {
            console.warn('MapPage: Error updating markers after loading locations:', error);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("MapPage: Error loading locations:", errorMessage);
      
      // Set empty locations instead of error state to prevent app crash
      setLocations([]);
      
      // Only set error if it's a serious issue, not empty data
      if (!errorMessage.includes('empty') && !errorMessage.includes('no rows')) {
        setError("Konumlar yüklenirken hata oluştu");
      }
    }
  }, [profile, setLocations, setError, updateMapMarkers]);

  const saveLocation = useCallback(async () => {
    if (!locationForm.name.trim()) {
      setError("Yer adı gereklidir");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driverlocations')
        .insert({
          name: locationForm.name,
          notes: locationForm.notes,
          latitude: locationForm.latitude,
          longitude: locationForm.longitude,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => [data, ...prev]);
      setLocationForm({ name: "", notes: "", latitude: 0, longitude: 0 });
      setNewLocationModal(false);

      if (mapInstanceRef.current && mapInstanceRef.current.getContainer && mapInstanceRef.current.getContainer()) {
        const L = (await import("leaflet")).default;
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          try {
            const marker = L.marker([lat, lng])
              .addTo(mapInstanceRef.current)
              .bindPopup(`<strong>${data.name}</strong><br/>${data.notes || 'Not yok'}`);
            
            markersRef.current.push(marker);
          } catch (error) {
            console.warn('Error adding marker after save:', error);
          }
        }
      }
    } catch (error) {
      console.error("Error saving location:", error);
      setError("Konum kaydedilirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [locationForm, profile, setLocations, setLoading, setError]);

  const deleteLocation = useCallback(async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('driverlocations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      setLocations(prev => prev.filter(l => l.id !== locationId));
      
      // Marker'ları güncelle
      if (mapInstanceRef.current) {
        const L = (await import("leaflet")).default;
        // locations state'i henüz güncellenmediği için, önceki state'i kullanarak filtreleme yapıyoruz.
        // Bu nedenle, doğrudan markersRef üzerinden değil, state'in güncel halini beklemeliyiz.
        // Ancak, setLocations callback ile güncellendiği için, burada locations state'i eski kalıyor.
        // Bu yüzden, updateMapMarkers'ı doğrudan çağırmak yerine, useEffect ile zaten güncellenecek.
        // Bu nedenle, burada updateMapMarkers'ı çağırmayıp, locations state'inin güncellenmesini bekleyeceğiz.
        // Alternatif olarak, setLocations içinde callback kullanarak güncellediğimiz için, markers'ı da hemen güncelleyebiliriz.
        // Fakat, updateMapMarkers zaten locations değiştiğinde useEffect içinde çağrılıyor.
        // Bu nedenle, burada ayrıca çağırmaya gerek yok.
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      setError("Konum silinirken hata oluştu");
    }
  }, [setLocations, setError]);

  useEffect(() => {
    // Initialize map once on component mount, with a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapInstanceRef.current && mapRef.current && !initializingMap) {
        initializeMap();
      }
    }, 100); // Small delay to ensure DOM is ready
    
    return () => {
      clearTimeout(timer);
      // Cleanup on unmount - prevent React DOM conflicts
      if (mapInstanceRef.current) {
        try {
          // Clear markers first
          markersRef.current.forEach(marker => {
            try {
              if (mapInstanceRef.current && mapInstanceRef.current.hasLayer && mapInstanceRef.current.hasLayer(marker)) {
                mapInstanceRef.current.removeLayer(marker);
              }
            } catch (error) {
              console.warn('MapPage: Error removing marker during cleanup:', error);
            }
          });
          markersRef.current = [];
          
          // Remove event listeners first to prevent further interactions
          if (mapInstanceRef.current.off) {
            mapInstanceRef.current.off('click', handleMapClick);
          }
          
          // Remove the map instance safely
          if (mapInstanceRef.current.remove) {
            mapInstanceRef.current.remove();
          }
          
        } catch (error) {
          console.warn('MapPage: Error during map cleanup:', error);
        } finally {
          // Clear references without touching DOM
          mapInstanceRef.current = null;
          setMapLoaded(false);
          setInitializingMap(false);
          
          // Clear container properties after React finishes its cleanup
          setTimeout(() => {
            if (mapRef.current) {
              const container = mapRef.current;
              try {
                // Clear Leaflet-specific properties
                delete (container as any)._leaflet_id;
                delete (container as any)._leaflet;
                // Don't clear innerHTML - let React handle its own DOM
              } catch (error) {
                console.warn('MapPage: Could not clear container properties:', error);
              }
            }
          }, 50);
        }
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  useEffect(() => {
    if (mapInstanceRef.current && locations.length > 0 && mapLoaded) {
      // Additional safety check
      if (!mapInstanceRef.current.getContainer || !mapInstanceRef.current.getContainer()) {
        console.warn('Map container is invalid, skipping marker update');
        return;
      }
      
      const updateMarkers = async () => {
        try {
          const L = (await import("leaflet")).default;
          updateMapMarkers(mapInstanceRef.current, locations, L);
        } catch (error) {
          console.error('Error updating markers in useEffect:', error);
        }
      };
      updateMarkers();
    }
  }, [locations, mapLoaded, updateMapMarkers]);

  // Load initial locations after map is ready
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current) {
      loadLocations();
    }
  }, [mapLoaded, loadLocations]);

  return (
    <div className="space-y-4">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapIcon className="h-5 w-5 text-green-600" />
              
            </div>
            <Button
              onClick={() => setIsAddLocationMode(!isAddLocationMode)}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddLocationMode ? "İptal" : "Konum Ekle"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            {isAddLocationMode && (
              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  📍 Konum eklemek için haritada istediğiniz yere tıklayın
                </p>
              </div>
            )}
            <div className="relative w-full h-96" style={{ minHeight: '320px' }}>
              <div 
                ref={mapRef}
                className="absolute inset-0 rounded-lg border-2 border-gray-200 driver-map-container"
                id="driver-map-page"
                suppressHydrationWarning={true}
              />
              {!mapLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center rounded-lg">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
                    <p className="text-gray-600">Harita yükleniyor...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Kayıtlı Konumlar ({locations.length})</h3>
              <Button
                onClick={loadLocations}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Yenile
              </Button>
            </div>
            
            {locations.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <MapPin className="h-8 w-8 text-gray-40 mx-auto mb-2" />
                <p className="text-gray-600">Henüz konum eklenmemiş</p>
                <p className="text-gray-500 text-sm">Haritaya konum eklemek için "Konum Ekle" butonunu kullanın</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {locations.map((location) => (
                  <div key={location.id} className="p-3 border border-gray-200 rounded-lg bg-white hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <MapPin className="h-4 w-4 text-red-500 mr-1" />
                          {location.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{location.notes || "Not yok"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          📍 {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-400">
                          📅 {new Date(location.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <Button
                        onClick={() => deleteLocation(location.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={newLocationModal} onOpenChange={setNewLocationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <span>Yeni Konum Ekle</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Yer Adı *</label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="Yer adını girin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notlar</label>
              <Textarea
                value={locationForm.notes}
                onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })}
                placeholder="Konum hakkında notlar"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Enlem</label>
                <Input
                  value={locationForm.latitude.toFixed(6)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Boylam</label>
                <Input
                  value={locationForm.longitude.toFixed(6)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setNewLocationModal(false)}
                disabled={loading}
              >
                İptal
              </Button>
              <Button
                onClick={saveLocation}
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={loading || !locationForm.name.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
