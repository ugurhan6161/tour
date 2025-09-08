"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Copy, CheckCircle2, ExternalLink, Phone, Globe } from "lucide-react";

interface CommunicationModalProps {
  task: any;
  onClose: () => void;
}

type Language = 'tr' | 'en' | 'ar';

const languages = {
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  ar: { name: 'العربية', flag: '🇸🇦' }
};

const translations = {
  tr: {
    greeting: "Merhaba",
    customer: "Müşteri",
    tourDetails: "Tur rezervasyonunuzla ilgili detaylar:",
    date: "Tarih:",
    time: "Saat:",
    pickup: "Kalkış:",
    dropoff: "Varış:",
    unknown: "Belirsiz",
    trackingLink: "Canlı takip bağlantınız:",
    farewell: "İyi yolculuklar dileriz!"
  },
  en: {
    greeting: "Hello",
    customer: "Customer",
    tourDetails: "Details about your tour reservation:",
    date: "Date:",
    time: "Time:",
    pickup: "Pickup:",
    dropoff: "Drop-off:",
    unknown: "Unknown",
    trackingLink: "Your live tracking link:",
    farewell: "Have a great trip!"
  },
  ar: {
    greeting: "مرحباً",
    customer: "العميل",
    tourDetails: "تفاصيل حجز رحلتكم:",
    date: "التاريخ:",
    time: "الوقت:",
    pickup: "نقطة الانطلاق:",
    dropoff: "الوجهة:",
    unknown: "غير محدد",
    trackingLink: "رابط التتبع المباشر:",
    farewell: "رحلة سعيدة!"
  }
};

export default function CommunicationModal({ task, onClose }: CommunicationModalProps) {
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('tr');
  const supabase = createClient();

  const generateMessage = (lang: Language, trackingUrl?: string) => {
    const t = translations[lang];
    const customerName = task.customer_name || t.customer;
    const pickupDate = new Date(task.pickup_date).toLocaleDateString(
      lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'tr-TR'
    );
    const pickupTime = task.pickup_time 
      ? new Date(`2000-01-01T${task.pickup_time}`).toLocaleTimeString(
          lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'tr-TR', 
          { hour: '2-digit', minute: '2-digit' }
        )
      : t.unknown;
    const pickupLocation = task.pickup_location || t.unknown;
    const dropoffLocation = task.dropoff_location || t.unknown;

    let message = `${t.greeting} ${customerName},\n\n${t.tourDetails}\n`;
    
    if (lang === 'ar') {
      // Arabic text direction - organize differently
      message += `📅 ${t.date} ${pickupDate}\n`;
      message += `🕐 ${t.time} ${pickupTime}\n`;
      message += `📍 ${t.pickup} ${pickupLocation}\n`;
      message += `📍 ${t.dropoff} ${dropoffLocation}\n`;
    } else {
      message += `📅 ${t.date} ${pickupDate}\n`;
      message += `🕐 ${t.time} ${pickupTime}\n`;
      message += `📍 ${t.pickup} ${pickupLocation}\n`;
      message += `📍 ${t.dropoff} ${dropoffLocation}\n`;
    }

    if (trackingUrl) {
      message += `\n🔗 ${t.trackingLink} ${trackingUrl}\n`;
    }

    message += `\n${t.farewell}`;

    return message;
  };

  useEffect(() => {
    // Fetch tracking link from database
    const fetchTrackingLink = async () => {
      try {
        console.log("[CommunicationModal] Fetching tracking link for task:", task.id);
        const { data: trackingData, error } = await supabase
          .from('tracking_links')
          .select('tracking_code')
          .eq('task_id', task.id)
          .eq('is_active', true)
          .single();
        
        if (trackingData && !error) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const link = `${baseUrl}/track/${trackingData.tracking_code}`;
          setTrackingLink(link);
          
          // Set default WhatsApp message with tracking link
          const defaultMessage = generateMessage(selectedLanguage, link);
          setWhatsappMessage(defaultMessage);
        } else {
          // Default message without tracking link
          const defaultMessage = generateMessage(selectedLanguage);
          setWhatsappMessage(defaultMessage);
        }
      } catch (error: any) {
        console.error("[CommunicationModal] Error fetching tracking link:", {
          message: error.message,
          stack: error.stack
        });
        setError("Takip bağlantısı alınamadı.");
        // Set default message without tracking link
        const defaultMessage = generateMessage(selectedLanguage);
        setWhatsappMessage(defaultMessage);
      }
    };
    
    fetchTrackingLink();
  }, [task, supabase, selectedLanguage]);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    // Regenerate message in new language
    const newMessage = generateMessage(language, trackingLink || undefined);
    setWhatsappMessage(newMessage);
  };

  const handleWhatsAppSend = () => {
    if (!task.customer_phone || !whatsappMessage) {
      setError("Müşteri telefonu veya mesaj içeriği eksik");
      return;
    }
    
    // Clean phone number (remove +90, spaces, etc.)
    const cleanPhone = task.customer_phone.replace(/[^0-9]/g, '');
    const whatsappPhone = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
    
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setError(null);
  };

  const handleCall = () => {
    if (!task.customer_phone) {
      setError("Müşteri telefon numarası bulunamadı");
      return;
    }
    
    const cleanPhone = task.customer_phone.replace(/[^0-9]/g, '');
    const telUrl = `tel:${cleanPhone}`;
    window.location.href = telUrl;
  };

  const handleCopyTrackingLink = async () => {
    if (!trackingLink) return;
    
    try {
      await navigator.clipboard.writeText(trackingLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("[CommunicationModal] Failed to copy tracking link:", error);
    }
  };

  const handleCopyPhone = async () => {
    if (!task.customer_phone) return;
    
    try {
      await navigator.clipboard.writeText(task.customer_phone);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("[CommunicationModal] Failed to copy phone number:", error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <span>İletişim & Bilgilendirme</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Müşteri Bilgileri */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3">Müşteri Bilgileri</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{task.customer_name || "Bilinmeyen Müşteri"}</p>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{task.customer_phone || "Telefon yok"}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCall}
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    disabled={!task.customer_phone}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Ara
                  </Button>
                  <Button
                    onClick={handleCopyPhone}
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    disabled={!task.customer_phone}
                  >
                    {copySuccess ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copySuccess ? 'Kopyalandı!' : 'Kopyala'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Görev Detayları */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-800 mb-2">Görev Detayları</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Görev:</span> {task.title || "Bilinmeyen Görev"}
              </div>
              <div>
                <span className="font-medium">Tarih:</span> {new Date(task.pickup_date).toLocaleDateString('tr-TR')}
              </div>
              <div>
                <span className="font-medium">Saat:</span> {task.pickup_time ? new Date(`2000-01-01T${task.pickup_time}`).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Belirsiz'}
              </div>
              <div>
                <span className="font-medium">Durum:</span> {task.status || "Bilinmeyen Durum"}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Güzergah:</span> {task.pickup_location || "Belirsiz"} → {task.dropoff_location || "Belirsiz"}
              </div>
            </div>
          </div>

          {/* Takip Bağlantısı */}
          {trackingLink && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center space-x-2">
                <ExternalLink className="h-4 w-4" />
                <span>Müşteri Takip Bağlantısı</span>
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-white/70 rounded-lg border border-green-200">
                  <Input 
                    value={trackingLink} 
                    readOnly 
                    className="flex-1 font-mono text-sm"
                  />
                  <Button 
                    onClick={handleCopyTrackingLink}
                    size="sm"
                    variant="outline"
                    className={`px-4 ${copySuccess ? 'bg-green-100 border-green-300 text-green-700' : ''}`}
                  >
                    {copySuccess ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copySuccess ? 'Kopyalandı!' : 'Kopyala'}
                  </Button>
                </div>
                <p className="text-xs text-green-600">
                  Bu bağlantıyı müşteriye göndererek seyahatini canlı olarak takip etmesini sağlayabilirsiniz.
                </p>
              </div>
            </div>
          )}

          {/* WhatsApp İletişim */}
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-emerald-800 flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Mesajı</span>
              </h4>
              
              {/* Language Selection */}
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-40 h-8 text-sm border-emerald-200">
                    <SelectValue placeholder="Dil seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(languages).map(([code, lang]) => (
                      <SelectItem key={code} value={code}>
                        <div className="flex items-center space-x-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {task.customer_phone ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="whatsappMessage">Mesaj İçeriği</Label>
                  <Textarea
                    id="whatsappMessage"
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    rows={8}
                    className={`mt-2 font-mono text-sm resize-none border-2 border-emerald-200 focus:border-emerald-400 ${selectedLanguage === 'ar' ? 'text-right' : 'text-left'}`}
                    placeholder="WhatsApp mesajınızı buraya yazın..."
                    dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleWhatsAppSend}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!whatsappMessage.trim()}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp'ta Gönder ({languages[selectedLanguage].flag} {languages[selectedLanguage].name})
                  </Button>
                </div>
                
                <p className="text-xs text-emerald-600">
                  Bu butona tıkladığınızda WhatsApp uygulaması açılacak ve seçili dildeki mesaj hazır halde gelecektir.
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Müşteri telefon numarası bulunamadı</p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
