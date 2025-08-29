"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OperationsDashboard from "@/components/operations/operations-dashboard";
import { Car, MapPin, AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function OperationsPage() {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadOperationsData() {
      try {
        console.log("[v0] Operations page: Starting authentication check");
        const supabase = createClient();

        // Kullanıcı kontrolü
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("[v0] Operations page: No authenticated user:", userError);
          router.push("/auth/login");
          return;
        }

        console.log("[v0] Operations page: User authenticated:", user.id);

        // Profil verisi çekme
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("[v0] Operations page: Error fetching profile:", profileError);
          router.push("/auth/login");
          return;
        }

        // Rol kontrolü
        if (!["operations", "admin"].includes(profileData.role)) {
          console.error("[v0] Operations page: User is not authorized:", profileData.role);
          router.push("/auth/login");
          return;
        }

        setProfile(profileData);
        console.log("[v0] Operations page: Profile obtained:", profileData.id);

        // Görevler
        const { data: tasksData, error: tasksError } = await supabase
          .from("driver_tasks_view")
          .select("*")
          .order("pickup_date", { ascending: true });

        if (tasksError) {
          console.error("[v0] Operations page: Error fetching tasks:", tasksError);
          setTasks([]);
        } else {
          setTasks(tasksData || []);
        }

        // Şoförler
        const { data: driversData, error: driversError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            drivers!drivers_user_id_fkey (
              user_id,
              vehicle_plate,
              license_number,
              is_active
            )
          `)
          .eq("role", "driver");

        if (driversError) {
          console.error("[v0] Operations page: Error fetching drivers:", driversError);
          setDrivers([]);
        } else {
          setDrivers(driversData || []);
        }

        console.log("[v0] Operations page: Data loaded successfully", {
          tasksCount: tasksData?.length,
          driversCount: driversData?.length,
        });
      } catch (error) {
        console.error("[v0] Operations page: Unexpected error:", error);
        setError(error.message);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    loadOperationsData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-white">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            {/* Resmi ekledik ve mobil uyumlu hale getirdik */}
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
