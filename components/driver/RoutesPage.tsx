// components/RoutesPage.tsx
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteIcon, RefreshCw, Plus, Save, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

// Supabase istemcisini oluştur
const supabase = createClient();

interface RoutesPageProps {
  routes: any[];
  setRoutes: (routes: any[]) => void;
  profile: any;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export default function RoutesPage({
  routes,
  setRoutes,
  profile,
  loading,
  setLoading,
  setError
}: RoutesPageProps) {
  const [routeForm, setRouteForm] = useState({
    name: "",
    category: "",
    description: "",
    places: [""]
  });

  const supabase = createClient();

  const saveRoute = async () => {
    if (!routeForm.name.trim() || !routeForm.category) {
      setError("Rota adı ve kategori gereklidir");
      return;
    }

    try {
      setLoading(true);

      const { data: routeData, error: routeError } = await supabase
        .from('tour_routes')
        .insert({
          name: routeForm.name,
          category: routeForm.category,
          description: routeForm.description,
          created_by: profile.id
        })
        .select()
        .single();

      if (routeError) throw routeError;

      const places = routeForm.places.filter(place => place.trim());
      if (places.length > 0) {
        const placesData = places.map((place, index) => ({
          route_id: routeData.id,
          place_name: place,
          order_index: index
        }));

        const { data: placesResult, error: placesError } = await supabase
          .from('route_places')
          .insert(placesData)
          .select();

        if (placesError) throw placesError;

        routeData.places = placesResult;
      } else {
        routeData.places = [];
      }

      setRoutes([routeData, ...routes]);
      setRouteForm({ name: "", category: "", description: "", places: [""] });
    } catch (error) {
      console.error("Error saving route:", error);
      setError("Rota kaydedilirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      await supabase
        .from('route_places')
        .delete()
        .eq('route_id', routeId);

      const { error } = await supabase
        .from('tour_routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;

      setRoutes(routes.filter(r => r.id !== routeId));
    } catch (error) {
      console.error("Error deleting route:", error);
      setError("Rota silinirken hata oluştu");
    }
  };

  const loadRoutes = async () => {
    try {
      const { data: routesData, error: routesError } = await supabase
        .from('tour_routes')
        .select(`
          *,
          route_places (
            id,
            route_id,
            place_name,
            order_index
          )
        `)
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (routesError) throw routesError;
      setRoutes(routesData || []);
    } catch (error) {
      console.error("Error loading routes:", error);
      setError("Rotalar yüklenirken hata oluştu");
    }
  };

  const categoryNames = {
    historical: '🏛️ Tarihi Yerler',
    nature: '🌲 Doğa Turları',
    cultural: '🎭 Kültürel Yerler',
    shopping: '🛍️ Alışveriş',
    food: '🍽️ Gastronomi',
    nightlife: '🌙 Gece Hayatı'
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
          <RouteIcon className="h-5 w-5 text-purple-600" />
              <span className="text-base font-bold text-gray-800">Tur Rotaları</span>
            </div>
            <Button
              onClick={loadRoutes}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Card className="border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Rota Ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rota Adı *</label>
                  <Input
                    value={routeForm.name}
                    onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                    placeholder="Rota adını girin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori *</label>
                  <Select value={routeForm.category} onValueChange={(value) => setRouteForm({ ...routeForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="historical">🏛️ Tarihi Yerler</SelectItem>
                      <SelectItem value="nature">🌲 Doğa Turları</SelectItem>
                      <SelectItem value="cultural">🎭 Kültürel Yerler</SelectItem>
                      <SelectItem value="shopping">🛍️ Alışveriş</SelectItem>
                      <SelectItem value="food">🍽️ Gastronomi</SelectItem>
                      <SelectItem value="nightlife">🌙 Gece Hayatı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <Textarea
                  value={routeForm.description}
                  onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                  placeholder="Rota açıklaması"
                  rows={2}
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Duraklar</label>
                <div className="space-y-2">
                  {routeForm.places.map((place, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                        {index + 1}
                      </div>
                      <Input
                        value={place}
                        onChange={(e) => {
                          const newPlaces = [...routeForm.places];
                          newPlaces[index] = e.target.value;
                          setRouteForm({ ...routeForm, places: newPlaces });
                        }}
                        placeholder={`Durak ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          const newPlaces = routeForm.places.filter((_, i) => i !== index);
                          setRouteForm({ ...routeForm, places: newPlaces });
                        }}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={routeForm.places.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => setRouteForm({ ...routeForm, places: [...routeForm.places, ""] })}
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-2 hover:bg-purple-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Durak Ekle
                  </Button>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  onClick={saveRoute}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  disabled={loading || !routeForm.name || !routeForm.category}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Rotayı Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {['historical', 'nature', 'cultural', 'shopping', 'food', 'nightlife'].map((category) => {
              const categoryRoutes = routes.filter(route => route.category === category);
              if (categoryRoutes.length === 0) return null;

              return (
                <Card key={category} className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-700">
                      {categoryNames[category]} ({categoryRoutes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {categoryRoutes.map((route) => (
                        <div key={route.id} className="p-3 border border-gray-100 rounded-lg bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{route.name}</h4>
                            <Button
                              onClick={() => deleteRoute(route.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {route.description && (
                            <p className="text-sm text-gray-600 mb-2">{route.description}</p>
                          )}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">Duraklar:</p>
                            <div className="space-y-1">
                              {route.places?.length > 0 ? (
                                route.places
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((place, index) => (
                                    <div key={place.id} className="flex items-center space-x-2">
                                      <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                                        {index + 1}
                                      </div>
                                      <span className="text-sm text-gray-700">{place.place_name}</span>
                                    </div>
                                  ))
                              ) : (
                                <p className="text-xs text-gray-500 italic">Durak eklenmemiş</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            📅 {new Date(route.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {routes.length === 0 && (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <RouteIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Henüz rota eklenmemiş</p>
                <p className="text-gray-500 text-sm">Yukarıdaki formu kullanarak yeni rota ekleyin</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
