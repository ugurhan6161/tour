"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OperationsDashboard from "@/components/operations/operations-dashboard";
import { Car, MapPin, AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function OperationsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadOperationsData() {
      try {
        console.log("[v1] Operations page: Starting authentication check");
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("[v1] Operations page: Authentication failed:", userError?.message);
          setError("Kimlik doğrulama başarısız. Lütfen tekrar giriş yapın.");
          router.push("/auth/login");
          return;
        }

        console.log("[v1] Operations page: User authenticated:", user.id);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("[v1] Operations page: Profile fetch error:", profileError?.message);
          setError("Profil bilgileri alınamadı.");
          router.push("/auth/login");
          return;
        }

        if (!["operations", "admin"].includes(profileData.role)) {
          console.error("[v1] Operations page: Unauthorized role:", profileData.role);
          setError("Bu sayfaya erişim yetkiniz yok.");
          router.push("/auth/login");
          return;
        }

        setProfile(profileData);
        console.log("[v1] Operations page: Profile loaded:", profileData.id);

        // Tasks verilerini çek
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .order("pickup_date", { ascending: true });

        if (tasksError) {
          console.error("[v1] Operations page: Tasks fetch error:", tasksError.message);
          setTasks([]);
        } else {
          console.log("[v1] Operations page: Tasks loaded:", tasksData?.length || 0);
          setTasks(tasksData || []);
        }

        console.log("[v1] Operations page: Fetching drivers data");
        
        // Şoför verilerini doğru şekilde çek
        const { data: driversData, error: driversError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            email
          `)
          .eq("role", "driver");

        if (driversError) {
          console.error("[v1] Operations page: Drivers profiles fetch error:", driversError.message);
          setDrivers([]);
          return;
        }

        // Şoför detay bilgilerini ayrı olarak çek
        const { data: driverDetailsData, error: driverDetailsError } = await supabase
          .from("drivers")
          .select(`
            user_id,
            vehicle_plate,
            vehicle_model,
            vehicle_color,
            vehicle_year,
            license_number,
            is_active
          `);

        if (driverDetailsError) {
          console.error("[v1] Operations page: Driver details fetch error:", driverDetailsError.message);
        }

        // Şoför fotoğraflarını ayrı olarak çek (eğer driver_photos tablosu varsa)
        const { data: driverPhotosData, error: driverPhotosError } = await supabase
          .from("driver_photos")
          .select(`
            driver_id,
            photo_url,
            is_active
          `)
          .eq("is_active", true);

        if (driverPhotosError) {
          console.error("[v1] Operations page: Driver photos fetch error:", driverPhotosError.message);
        }

        // Verileri birleştir
        const processedDrivers = (driversData || []).map(driver => {
          // İlgili şoför detayını bul
          const driverDetail = (driverDetailsData || []).find(
            detail => detail.user_id === driver.id
          );

          // İlgili şoför fotoğrafını bul
          const driverPhoto = (driverPhotosData || []).find(
            photo => photo.driver_id === driver.id
          );

          return {
            id: driver.id,
            full_name: driver.full_name || "Bilinmeyen Şoför",
            phone: driver.phone || "",
            email: driver.email || "",
            driver_info: driverDetail ? {
              user_id: driverDetail.user_id,
              vehicle_plate: driverDetail.vehicle_plate || "",
              vehicle_model: driverDetail.vehicle_model || "",
              vehicle_color: driverDetail.vehicle_color || "",
              vehicle_year: driverDetail.vehicle_year || null,
              license_number: driverDetail.license_number || "",
              is_active: driverDetail.is_active ?? false
            } : {
              user_id: driver.id,
              vehicle_plate: "",
              vehicle_model: "",
              vehicle_color: "",
              vehicle_year: null,
              license_number: "",
              is_active: false
            },
            active_photo: driverPhoto ? {
              photo_url: driverPhoto.photo_url || "",
              is_active: driverPhoto.is_active
            } : null
          };
        });

        const activeDriversCount = processedDrivers.filter(d => d.driver_info.is_active).length;
        console.log("[v1] Operations page: Processed drivers:", JSON.stringify(processedDrivers, null, 2));
        console.log("[v1] Operations page: Active drivers count:", activeDriversCount);
        setDrivers(processedDrivers);
        
        console.log("[v1] Operations page: Data loading completed", {
          tasksCount: tasksData?.length || 0,
          driversCount: driversData?.length || 0,
          activeDriversCount: activeDriversCount
        });

      } catch (error: any) {
        console.error("[v1] Operations page: Unexpected error:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setError(error.message || "Bilinmeyen bir hata oluştu");
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    loadOperationsData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-white">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-48 h-48 md:w-64 md:h-64 animate-pulse">
              <Image
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0zCbCWJQel7wZYoNmMnOJRuiTyNgfEQUwXw&s"
                alt="Yükleniyor..."
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-800">Operasyon Paneli Yükleniyor...</p>
          <p className="text-sm text-gray-500 animate-pulse">Görevler ve şoförler hazırlanıyor...</p>
        </div>
        <style jsx>{`
          @keyframes moveCar {
            0%, 100% { transform: translateX(-20px) rotate(45deg); }
            50% { transform: translateX(20px) rotate(45deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
          <p className="text-lg font-semibold text-gray-800">Hata Oluştu</p>
          <p className="text-sm text-gray-600">{error}</p>
          <Button
            onClick={() => router.push("/auth/login")}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Giriş Sayfasına Dön
          </Button>
        </div>
      </div>
    );
  }

  if (!profile || !tasks || !drivers) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-center">
            <Car className="h-12 w-12 text-blue-500 animate-bounce" />
          </div>
          <p className="text-lg font-semibold text-gray-800">Veriler Yükleniyor...</p>
          <p className="text-sm text-gray-600">Lütfen biraz daha bekleyin.</p>
        </div>
      </div>
    );
  }

  return <OperationsDashboard profile={profile} initialTasks={tasks} drivers={drivers} />;
}