"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DriverDashboard from "@/components/driver/driver-dashboard";
import { Car, MapPin, AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DriverPage() {
  const [profile, setProfile] = useState(null);
  const [driver, setDriver] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadDriverData() {
      try {
        console.log("[v0] Driver page: Starting authentication check");
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("[v0] Driver page: No authenticated user:", userError);
          router.push("/auth/login");
          return;
        }

        console.log("[v0] Driver page: User authenticated:", user.id);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("[v0] Driver page: Error fetching profile:", profileError);
          router.push("/auth/login");
          return;
        }

        if (profileData.role !== "driver") {
          console.error("[v0] Driver page: User is not a driver:", profileData.role);
          router.push("/auth/login");
          return;
        }

        setProfile(profileData);
        console.log("[v0] Driver page: Profile obtained:", profileData.id);

        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("*")
          .eq("user_id", profileData.id)
          .single();

        console.log("[v0] Driver page: Driver query result:", { driver: driverData, driverError });

        if (driverError || !driverData) {
          console.error("[v0] Driver page: Error fetching driver or no driver found:", driverError);
          router.push("/auth/login");
          return;
        }

        setDriver(driverData);

        const { data: tasksData, error: tasksError } = await supabase
          .from("driver_tasks_view")
          .select("*")
          .eq("assigned_driver_id", profileData.id)
          .order("pickup_date", { ascending: true });

        console.log("[v0] Driver page: Tasks query result:", { tasksCount: tasksData?.length, tasksError });

        if (tasksError) {
          console.error("[v0] Driver page: Error fetching tasks:", tasksError);
          setTasks([]);
        } else {
          setTasks(tasksData || []);
        }

        console.log("[v0] Driver page: Data loaded successfully");
      } catch (error) {
        console.error("[v0] Driver page: Unexpected error:", error);
        setError(error.message);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    loadDriverData();
  }, [router]);

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
