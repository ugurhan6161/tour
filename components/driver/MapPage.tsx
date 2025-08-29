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
  }, []);

  const initializeMap = useCallback(async () => {
    if (typeof window !== "undefined" && !mapInstanceRef.current && mapRef.current) {
      try {
        // Önce mevcut harita örneğini temizle
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const L = (await import("leaflet")).default;
        
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // NOT: Container'ın innerHTML'ini temizlemeyi ve _leaflet_id atamasını kaldırıyoruz.
        // Leaflet, kendi remove metodu ile temizliği yapar.

        const map = L.map(mapRef.current).setView([41.0, 39.72], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapLoaded(true);

        map.on('click', handleMapClick);
        
        if (locations.length > 0) {
          updateMapMarkers(map, locations, L);
        }
      } catch (error) {
        console.error("Map initialization error:", error);
        setError("Harita yüklenirken hata oluştu");
      }
    }
  }, [handleMapClick, locations, setError]);

  const updateMapMarkers = useCallback((map: any, locations: any[], L: any) => {
    // Önceki tüm marker'ları temizle
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    // Yeni marker'ları ekle
    locations.forEach(location => {
      const marker = L.marker([location.latitude, location.longitude])
        .addTo(map)
        .bindPopup(`<strong>${location.name}</strong><br/>${location.notes || 'Not yok'}`);
      
      markersRef.current.push(marker);
    });
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
      
      if (mapInstanceRef.current && data && data.length > 0) {
        const L = (await import("leaflet")).default;
        updateMapMarkers(mapInstanceRef.current, data, L);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      setError("Konumlar yüklenirken hata oluştu");
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
        .from('driver_locations')
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

      if (mapInstanceRef.current) {
        const L = (await import("leaflet")).default;
        const marker = L.marker([data.latitude, data.longitude])
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong>${data.name}</strong><br/>${data.notes || 'Not yok'}`);
        
        markersRef.current.push(marker);
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
        .from('driver_locations')
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
    initializeMap();
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Sadece mount ve unmount'ta çalışsın

  useEffect(() => {
    if (mapInstanceRef.current && locations.length > 0 && mapLoaded) {
      const updateMarkers = async () => {
        const L = (await import("leaflet")).default;
        updateMapMarkers(mapInstanceRef.current, locations, L);
      };
      updateMarkers();
    }
  }, [locations, mapLoaded, updateMapMarkers]);

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
            <div 
              ref={mapRef}
              className="w-full rounded-lg border-2 border-gray-200 px-[-0px] px-[-10px] px-[-30px] px-[-40px] px-[-50px] px-[-60px] px-0 space-y-0 h-96"
              style={{ minHeight: '320px' }}
            >
              {!mapLoaded && (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center rounded-lg">
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
                          📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
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
