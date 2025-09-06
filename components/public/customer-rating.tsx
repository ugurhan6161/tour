"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, MessageCircle, User } from "lucide-react";

interface CustomerRatingProps {
  taskId: string;
  trackingLinkId: string;
  driverName: string;
  language: 'tr' | 'en';
  onRatingSubmitted: () => void;
}

const translations = {
  tr: {
    title: "Seyahatiniz Tamamlandı!",
    subtitle: "Şoförünüzü değerlendirin",
    rateDriver: "Şoförü Değerlendirin",
    rating: "Puan",
    reviewPlaceholder: "Seyahatiniz hakkında yorumunuzu yazın (isteğe bağlı)",
    yourName: "Adınız (İsteğe Bağlı)",
    namePlaceholder: "Adınızı girin",
    submit: "Değerlendirmeyi Gönder",
    submitting: "Gönderiliyor...",
    success: "Değerlendirmeniz başarıyla gönderildi!",
    successMessage: "Geri bildiriminiz için teşekkür ederiz.",
    error: "Bir hata oluştu",
    required: "Lütfen puan verin",
    selectStars: "Yıldızlara tıklayarak puan verin",
    excellent: "Mükemmel",
    good: "İyi", 
    average: "Orta",
    poor: "Kötü",
    terrible: "Çok Kötü"
  },
  en: {
    title: "Trip Completed!",
    subtitle: "Rate your driver",
    rateDriver: "Rate Driver",
    rating: "Rating",
    reviewPlaceholder: "Write your review about the trip (optional)",
    yourName: "Your Name (Optional)",
    namePlaceholder: "Enter your name",
    submit: "Submit Rating",
    submitting: "Submitting...",
    success: "Rating submitted successfully!",
    successMessage: "Thank you for your feedback.",
    error: "An error occurred",
    required: "Please provide a rating",
    selectStars: "Click stars to rate",
    excellent: "Excellent",
    good: "Good",
    average: "Average", 
    poor: "Poor",
    terrible: "Terrible"
  }
};

const ratingLabels = {
  tr: ["Çok Kötü", "Kötü", "Orta", "İyi", "Mükemmel"],
  en: ["Terrible", "Poor", "Average", "Good", "Excellent"]
};

export default function CustomerRating({ 
  taskId, 
  trackingLinkId, 
  driverName, 
  language, 
  onRatingSubmitted 
}: CustomerRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const t = translations[language];

  const submitRating = async () => {
    if (rating === 0) {
      setError(t.required);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('customer_ratings')
        .insert({
          task_id: taskId,
          tracking_link_id: trackingLinkId,
          rating: rating,
          review_text: reviewText.trim() || null,
          customer_name: customerName.trim() || null
        });

      if (error) throw error;

      setSubmitted(true);
      onRatingSubmitted();
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto mt-8 bg-green-50 border-green-200">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">{t.success}</h2>
          <p className="text-green-600">{t.successMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-8 bg-white shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center">
        <CardTitle className="flex flex-col items-center space-y-2">
          <CheckCircle className="w-8 h-8" />
          <span>{t.title}</span>
        </CardTitle>
        <p className="text-blue-100">{t.subtitle}</p>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Driver info */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <User className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-gray-800">{driverName}</span>
          </div>
        </div>

        {/* Rating stars */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t.rating}</Label>
          <div className="flex justify-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          
          {/* Rating label */}
          {(hoveredRating || rating) > 0 && (
            <p className="text-center text-sm font-medium text-gray-600">
              {ratingLabels[language][(hoveredRating || rating) - 1]}
            </p>
          )}
          
          {rating === 0 && (
            <p className="text-center text-sm text-gray-500">{t.selectStars}</p>
          )}
        </div>

        {/* Review text */}
        <div className="space-y-2">
          <Label htmlFor="review" className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>{t.reviewPlaceholder}</span>
          </Label>
          <Textarea
            id="review"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={t.reviewPlaceholder}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Customer name */}
        <div className="space-y-2">
          <Label htmlFor="customerName">{t.yourName}</Label>
          <Input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t.namePlaceholder}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <Button
          onClick={submitRating}
          disabled={loading || rating === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t.submitting}</span>
            </div>
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              {t.submit}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
