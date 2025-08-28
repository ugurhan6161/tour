"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DriverDashboard from "@/components/driver/driver-dashboard";
import { Car, MapPin, AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function DriverPage() {
  const [profile, setProfile] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDriverData() {
      try {
        console.log("[v0] Driver page: Starting session check");
        // Oturum kontrolü
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("[v0] Driver page: No active session:", sessionError);
          toast.error("Oturum bulunamadı, lütfen giriş yapın.");
          router.push("/auth/login");
          return;
        }

        console.log("[v0] Driver page: Session found, user ID:", session.user.id);

        // Kullanıcı bilgilerini al
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("[v0] Driver page: No authenticated user:", {
            message: userError?.message,
            code: userError?.code,
            status: userError?.status,
          });
          toast.error("Kullanıcı doğrulanamadı, lütfen tekrar giriş yapın.");
          router.push("/auth/login");
          return;
        }

        console.log("[v0] Driver page: User authenticated:", user.id);

        // Profil bilgilerini al
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("[v0] Driver page: Error fetching profile:", {
            message: profileError?.message,
            code: profileError?.code,
            status: profileError?.status,
          });
          toast.error("Profil bilgileri alınamadı.");
          router.push("/auth/login");
          return;
        }

        if (profileData.role !== "driver") {
          console.error("[v0] Driver page: User is not a driver:", profileData.role);
          toast.error("Bu hesap şoför paneline erişim yetkisine sahip değil.");
          router.push("/auth/login");
          return;
        }

        setProfile(profileData);
        console.log("[v0] Driver page: Profile obtained:", profileData.id);

        // Şoför bilgilerini al
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("*")
          .eq("user_id", profileData.id)
          .single();

        if (driverError || !driverData) {
          console.error("[v0] Driver page: Error fetching driver or no driver found:", {
            message: driverError?.message,
            code: driverError?.code,
            status: driverError?.status,
          });
          toast.error("Şoför bilgileri alınamadı.");
          router.push("/auth/login");
          return;
        }

        setDriver(driverData);
        console.log("[v0] Driver page: Driver query result:", { driver: driverData });

        // Görevleri al
        const { data: tasksData, error: tasksError } = await supabase
          .from("driver_tasks_view")
          .select("*")
          .eq("assigned_driver_id", profileData.id)
          .order("pickup_date", { ascending: true });

        if (tasksError) {
          console.error("[v0] Driver page: Error fetching tasks:", {
            message: tasksError?.message,
            code: tasksError?.code,
            status: tasksError?.status,
          });
          toast.error("Görevler alınırken hata oluştu.");
          setTasks([]);
        } else {
          setTasks(tasksData || []);
          console.log("[v0] Driver page: Tasks query result:", { tasksCount: tasksData?.length });
        }

        console.log("[v0] Driver page: Data loaded successfully");
      } catch (error: any) {
        console.error("[v0] Driver page: Unexpected error:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        setError(error.message || "Bilinmeyen bir hata oluştu");
        toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    loadDriverData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <div className="text-center space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Map Pin */}
            <div className="absolute animate-pulse">
              <MapPin className="h-12 w-12 text-red-500" />
            </div>
            {/* Moving Car */}
            <div className="relative animate-[moveCar_2s_ease-in-out_infinite]">
              <Car className="h-8 w-8 text-blue-600 transform rotate-45" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-800">Şoför Paneli Yükleniyor...</p>
          <p className="text-sm text-gray-500 animate-pulse">Görevleriniz hazırlanıyor, lütfen bekleyin.</p>
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

  if (!profile || !driver) {
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

  return <DriverDashboard profile={profile} driver={driver} initialTasks={tasks} />;
}
