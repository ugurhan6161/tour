// components/driver/RatingsPage.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, User, Calendar, Car, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Rating {
  id: string;
  rating: number;
  review_text: string | null;
  customer_name: string | null;
  created_at: string;
  task: {
    pickup_location: string;
    dropoff_location: string;
    pickup_date: string;
  } | null;
}

interface RatingsPageProps {
  profile: any;
  driver: any;
  setCurrentPage: (page: string) => void;
}

export default function RatingsPage({ profile, driver, setCurrentPage }: RatingsPageProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  
  const supabase = createClient();

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      setLoading(true);
      
      // Get ratings for this driver's tasks
      const { data, error } = await supabase
        .from('customer_ratings')
        .select(`
          id,
          rating,
          review_text,
          customer_name,
          created_at,
          task:tasks (
            pickup_location,
            dropoff_location,
            pickup_date
          )
        `)
        .eq('task.assigned_driver_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fix the data structure to match our Rating interface
      const formattedRatings = (data || []).map((rating: any) => ({
        ...rating,
        task: rating.task && Array.isArray(rating.task) && rating.task.length > 0 
          ? rating.task[0] 
          : rating.task || null
      }));

      setRatings(formattedRatings);
      
      // Calculate average rating
      if (formattedRatings.length > 0) {
        const total = formattedRatings.reduce((sum: number, rating: Rating) => sum + rating.rating, 0);
        setAverageRating(total / formattedRatings.length);
        setTotalRatings(formattedRatings.length);
      }
    } catch (error) {
      console.error("Error loading ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy HH:mm", { locale: tr });
    } catch {
      return dateString;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Summary Card */}
      {totalRatings > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-center sm:text-left">
                <h2 className="text-lg font-semibold text-gray-800">Ortalama Puan</h2>
                <div className="flex items-center space-x-2 mt-2">
                  {renderStars(Math.round(averageRating || 0))}
                  <span className="text-2xl font-bold text-gray-900">
                    {averageRating?.toFixed(1)}
                  </span>
                  <span className="text-gray-600">/ 5</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{totalRatings}</p>
                <p className="text-gray-600">Toplam Değerlendirme</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings List */}
      <div className="space-y-4">
        {ratings.length === 0 ? (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz değerlendirme yok</h3>
              <p className="text-gray-600">
                Tamamlanan görevlerden sonra müşterileriniz değerlendirmelerini yapacak.
              </p>
            </CardContent>
          </Card>
        ) : (
          ratings.map((rating) => (
            <Card key={rating.id} className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {rating.customer_name || "Müşteri"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(rating.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {renderStars(rating.rating)}
                    <span className="font-semibold text-gray-900">{rating.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {rating.task && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(rating.task.pickup_date)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Car className="h-4 w-4 mr-1" />
                      <span className="truncate">
                        {rating.task.pickup_location} → {rating.task.dropoff_location}
                      </span>
                    </div>
                  </div>
                )}
                {rating.review_text && (
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {rating.review_text}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
