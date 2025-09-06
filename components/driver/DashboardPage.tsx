import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Map, Route, Languages, Home, User, Phone, Car, ChevronDown, ChevronUp, Star, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface DashboardPageProps {
  tasks: any[];
  locations: any[];
  routes: any[];
  setCurrentPage: (page: string) => void;
  getStatusCount: (status: string) => number;
  profile: any;
  driver: any;
  hasNewTasks?: boolean;
  hasTaskUpdates?: boolean;
  lastRefreshTime?: Date | null;
  currentLocation?: any;
  isLocationTracking?: boolean;
}

export default function DashboardPage({
  tasks,
  locations,
  routes,
  setCurrentPage,
  getStatusCount,
  profile,
  driver,
  hasNewTasks,
  hasTaskUpdates,
  lastRefreshTime,
  currentLocation,
  isLocationTracking
}: DashboardPageProps) {
  const [isDriverInfoExpanded, setIsDriverInfoExpanded] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0); // Cache busting için

  const supabase = createClient();

  // Log driver and profile props for debugging
  useEffect(() => {
    console.log('Driver prop:', driver);
    console.log('Profile prop:', profile);
  }, [driver, profile]);

  // Load current driver photo on mount
// Mevcut useEffect'i şu şekilde değiştirin (satır 62 civarı):
useEffect(() => {
  const fetchDriverPhoto = async () => {
    if (!driver?.user_id) {
      console.warn('Driver user_id is missing');
      setPhotoUrl(null); // Null olarak ayarla
      return;
    }
    try {
      const { data, error } = await supabase
        .from('driver_photos')
        .select('photo_url')
        .eq('driver_id', driver.user_id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching driver photo:', error.message);
        setPhotoUrl(null);
      } else if (data?.photo_url) {
        // URL'yi doğrudan kullan, cache busting sonradan ekle
        const photoUrlWithCache = `${data.photo_url}?t=${Date.now()}`;
        setPhotoUrl(photoUrlWithCache);
        console.log('Driver photo loaded:', photoUrlWithCache);
      } else {
        setPhotoUrl(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching driver photo:', err);
      setPhotoUrl(null);
    }
  };

  fetchDriverPhoto();
}, [driver?.user_id, supabase, photoRefreshKey]);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Lütfen bir resim dosyası seçin (JPEG, PNG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError('Resim dosyası 5MB\'dan küçük olmalıdır.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      
      // Önizleme için geçici URL oluştur
      const objectUrl = URL.createObjectURL(file);
      setPhotoUrl(objectUrl);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async () => {
    console.log('handlePhotoUpload called');
    if (!selectedFile || !driver?.user_id) {
      setUploadError('Dosya veya sürücü kimliği eksik.');
      console.error('Missing selectedFile or driver.user_id:', { selectedFile, driverUserId: driver?.user_id });
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Check user authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı kimlik doğrulaması başarısız.');
      }
      console.log('User ID:', user.id, 'Driver user_id:', driver.user_id);

      // Generate unique file name
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${driver.user_id}/${fileName}`;

      console.log('Uploading file to:', filePath);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('driver-photos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Resim yüklenirken hata: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('driver-photos')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Public URL alınamadı.');
      }

      console.log('Public URL:', publicUrl);

      // Deactivate previous photo
      const { error: deactivateError } = await supabase
        .from('driver_photos')
        .update({ is_active: false })
        .eq('driver_id', driver.user_id)
        .eq('is_active', true);

      if (deactivateError) {
        console.warn('Error deactivating previous photo:', deactivateError.message);
      }

      // Insert new photo record
      const { error: insertError } = await supabase
        .from('driver_photos')
        .insert({
          driver_id: driver.user_id,
          photo_url: publicUrl,
          is_active: true,
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Resim kaydı eklenirken hata: ${insertError.message}`);
      }

      // Cache busting için timestamp ekle ve photoRefreshKey'i güncelle
      setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
      setPhotoRefreshKey(prev => prev + 1);
      setIsPhotoModalOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Photo upload error:', error);
      setUploadError(error.message || 'Resim yüklenirken beklenmeyen bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (photoUrl && photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  return (
    <div className="space-y-6">
      {/* Driver Status Card with Collapsible Content */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden p-3 sm:p-4">
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
              }}
            ></div>
          </div>
          <div className="flex items-center justify-between relative z-10">
            <CardTitle
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setIsDriverInfoExpanded(!isDriverInfoExpanded)}
            >
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold">Şoför Durumu</div>
                <div className="text-sm opacity-90">
                  {driver?.is_active ? "🟢 Aktif" : "🔴 Pasif"}
                </div>
              </div>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 p-1"
              onClick={() => setIsDriverInfoExpanded(!isDriverInfoExpanded)}
            >
              {isDriverInfoExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-3 relative z-10">
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg sm:text-xl font-bold">{getStatusCount("new")}</div>
                <div className="text-xs opacity-90">Yeni</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg sm:text-xl font-bold">{getStatusCount("assigned")}</div>
                <div className="text-xs opacity-90">Bekleyen</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg sm:text-xl font-bold">{getStatusCount("in_progress")}</div>
                <div className="text-xs opacity-90">Aktif</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg sm:text-xl font-bold">{getStatusCount("completed")}</div>
                <div className="text-xs opacity-90">Biten</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg sm:text-xl font-bold">{getStatusCount("cancelled")}</div>
                <div className="text-xs opacity-90">İptal</div>
              </div>
            </div>
          </div>
        </CardHeader>

        {isDriverInfoExpanded && (
          <CardContent className="p-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-6">
              <Avatar
                className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-blue-100 cursor-pointer hover:ring-blue-200 transition-all duration-200"
                onClick={() => driver?.user_id ? setIsPhotoModalOpen(true) : setUploadError('Şoför kimliği bulunamadı.')}
              >
                <AvatarImage 
                  src={photoUrl} 
                  onError={(e) => {
                    // Resim yüklenemediğinde fallback göster
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                  {profile?.full_name?.charAt(0) || 'Ş'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  {profile?.full_name || 'Belirtilmemiş'}
                </h3>
                <p className="text-gray-600 text-sm">Profil resmini değiştirmek için üzerine tıklayın</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100 px-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg shadow-lg flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-blue-600 mb-1">Şoför Adı</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{profile?.full_name || "Belirtilmemiş"}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg shadow-lg flex-shrink-0">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-green-600 mb-1">İletişim</p>
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {profile?.phone || "Belirtilmemiş"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500 rounded-lg shadow-lg flex-shrink-0">
                    <Car className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-purple-600 mb-1">Araç Plakası</p>
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {driver?.vehicle_plate || "Belirtilmemiş"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Photo Upload Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Profil Resmini Düzenle</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Avatar className="h-32 w-32 ring-4 ring-blue-100">
                <AvatarImage 
                  src={photoUrl} 
                  alt="Profil resmi önizleme"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                  {profile?.full_name?.charAt(0) || 'Ş'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-upload" className="text-sm font-medium text-gray-700">
                Yeni Resim Yükle
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="border-gray-300"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600">Seçilen dosya: {selectedFile.name}</p>
              )}
              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPhotoModalOpen(false);
                setSelectedFile(null);
                setUploadError(null);
                // Önizleme URL'sini temizle ve orijinal fotoğrafı geri yükle
                if (photoUrl && photoUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(photoUrl);
                }
                setPhotoRefreshKey(prev => prev + 1); // Orijinal fotoğrafı yeniden yükle
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handlePhotoUpload}
              disabled={!selectedFile || isUploading || !driver?.user_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Yükleniyor...
                </span>
              ) : (
                <span className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Yükle
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Buttons - Modern Design */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-gray-600" />
            <span className="text-base font-bold text-gray-800">Ana Menü</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              onClick={() => setCurrentPage("tasks")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Calendar className="h-6 w-6" />
              <span className="font-medium">Görevler</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {tasks.length}
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("map")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Map className="h-6 w-6" />
              <span className="font-medium">Harita</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {locations.length}
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("ratings")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Star className="h-6 w-6" />
              <span className="font-medium">Değerlendirmeler</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                Yeni
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("routes")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Route className="h-6 w-6" />
              <span className="font-medium">Tur Rotaları</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {routes.length}
              </Badge>
            </Button>
            
            <Button
              onClick={() => setCurrentPage("translation")}
              className="h-24 flex-col space-y-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Languages className="h-6 w-6" />
              <span className="font-medium">Dil Çeviri</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                TR/EN
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}