// components/TranslationPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Volume2, Copy, Loader2 } from "lucide-react";

interface TranslationPageProps {
  translationText: string;
  setTranslationText: (text: string) => void;
  translatedText: string;
  setTranslatedText: (text: string) => void;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  isTranslating: boolean;
  setIsTranslating: (translating: boolean) => void;
  setError: (error: string | null) => void;
}

export default function TranslationPage({
  translationText,
  setTranslationText,
  translatedText,
  setTranslatedText,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  isTranslating,
  setIsTranslating,
  setError
}: TranslationPageProps) {
  const translateText = async () => {
    if (!translationText.trim()) {
      setError("Çevrilecek metin girmelisiniz");
      return;
    }

    try {
      setIsTranslating(true);
      
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: translationText,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
    } catch (error) {
      console.error("Translation error:", error);
      
      const simpleTranslations: { [key: string]: { [key: string]: string } } = {
        'tr-en': {
          'merhaba': 'hello',
          'hoş geldiniz': 'welcome',
          'teşekkür ederim': 'thank you',
          'lütfen': 'please',
          'özür dilerim': 'sorry',
          'yardım eder misiniz': 'can you help me',
          'nereye gitmek istiyorsunuz': 'where would you like to go',
          'ne kadar sürüyor': 'how long does it take',
          'günaydın': 'good morning',
          'iyi akşamlar': 'good evening'
        },
        'en-tr': {
          'hello': 'merhaba',
          'welcome': 'hoş geldiniz',
          'thank you': 'teşekkür ederim',
          'please': 'lütfen',
          'sorry': 'özür dilerim',
          'can you help me': 'yardım eder misiniz',
          'where would you like to go': 'nereye gitmek istiyorsunuz',
          'how long does it take': 'ne kadar sürüyor',
          'good morning': 'günaydın',
          'good evening': 'iyi akşamlar'
        }
      };

      const translationKey = `${sourceLang}-${targetLang}`;
      const translated = simpleTranslations[translationKey]?.[translationText.toLowerCase()] || 
                        `[${translationKey}] ${translationText}`;
      
      setTranslatedText(translated);
    } finally {
      setIsTranslating(false);
    }
  };

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'tr' ? 'tr-TR' : lang === 'en' ? 'en-US' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const commonPhrases = [
    { tr: "Merhaba", en: "Hello", de: "Hallo", fr: "Bonjour", es: "Hola", ar: "مرحبا" },
    { tr: "Hoş geldiniz", en: "Welcome", de: "Willkommen", fr: "Bienvenue", es: "Bienvenido", ar: "أهلا وسهلا" },
    { tr: "Teşekkür ederim", en: "Thank you", de: "Danke", fr: "Merci", es: "Gracias", ar: "شكرا" },
    { tr: "Lütfen", en: "Please", de: "Bitte", fr: "S'il vous plaît", es: "Por favor", ar: "من فضلك" },
    { tr: "Özür dilerim", en: "Sorry", de: "Entschuldigung", fr: "Excusez-moi", es: "Lo siento", ar: "آسف" },
    { tr: "Yardım eder misiniz?", en: "Can you help me?", de: "Können Sie mir helfen?", fr: "Pouvez-vous m'aider?", es: "¿Puedes ayudarme?", ar: "هل يمكنك مساعدتي؟" },
    { tr: "Nereye gitmek istiyorsunuz?", en: "Where would you like to go?", de: "Wohin möchten Sie gehen?", fr: "Où voulez-vous aller?", es: "¿A dónde quieres ir?", ar: "أين تريد أن تذهب؟" },
    { tr: "Ne kadar sürüyor?", en: "How long does it take?", de: "Wie lange dauert es?", fr: "Combien de temps cela prend-il?", es: "¿Cuánto tiempo toma?", ar: "كم من الوقت يستغرق؟" },
    { tr: "Günaydın", en: "Good morning", de: "Guten Morgen", fr: "Bonjour", es: "Buenos días", ar: "صباح الخير" },
    { tr: "İyi akşamlar", en: "Good evening", de: "Guten Abend", fr: "Bonsoir", es: "Buenas tardes", ar: "مساء الخير" },
    { tr: "Ne kadar?", en: "How much?", de: "Wie viel?", fr: "Combien?", es: "¿Cuánto?", ar: "كم؟" },
    { tr: "Çok güzel", en: "Very beautiful", de: "Sehr schön", fr: "Très beau", es: "Muy hermoso", ar: "جميل جدا" },
    { tr: "Anlayamıyorum", en: "I don't understand", de: "Ich verstehe nicht", fr: "Je ne comprends pas", es: "No entiendo", ar: "لا أفهم" },
    { tr: "Yavaş konuşun", en: "Speak slowly", de: "Sprechen Sie langsam", fr: "Parlez lentement", es: "Habla despacio", ar: "تكلم ببطء" },
    { tr: "Tekrar söyler misiniz?", en: "Can you repeat?", de: "Können Sie das wiederholen?", fr: "Pouvez-vous répéter?", es: "¿Puedes repetir?", ar: "هل يمكنك أن تكرر؟" },
    { tr: "Burası nerededir?", en: "Where is this?", de: "Wo ist das?", fr: "Où est-ce?", es: "¿Dónde está esto?", ar: "أين هذا؟" }
  ];

  return (
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
      <CardHeader className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b">
        <CardTitle className="flex items-center space-x-2">
          <Languages className="h-5 w-5 text-orange-600" />
          <span className="text-base font-bold text-gray-800">Dil Çeviri</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kaynak Dil</label>
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                  <SelectItem value="en">🇺🇸 İngilizce</SelectItem>
                  <SelectItem value="de">🇩🇪 Almanca</SelectItem>
                  <SelectItem value="fr">🇫🇷 Fransızca</SelectItem>
                  <SelectItem value="es">🇪🇸 İspanyolca</SelectItem>
                  <SelectItem value="ar">🇸🇦 Arapça</SelectItem>
                  <SelectItem value="ru">🇷🇺 Rusça</SelectItem>
                  <SelectItem value="zh">🇨🇳 Çince</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hedef Dil</label>
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                  <SelectItem value="en">🇺🇸 İngilizce</SelectItem>
                  <SelectItem value="de">🇩🇪 Almanca</SelectItem>
                  <SelectItem value="fr">🇫🇷 Fransızca</SelectItem>
                  <SelectItem value="es">🇪🇸 İspanyolca</SelectItem>
                  <SelectItem value="ar">🇸🇦 Arapça</SelectItem>
                  <SelectItem value="ru">🇷🇺 Rusça</SelectItem>
                  <SelectItem value="zh">🇨🇳 Çince</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                const temp = sourceLang;
                setSourceLang(targetLang);
                setTargetLang(temp);
                setTranslationText(translatedText);
                setTranslatedText(translationText);
              }}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              🔄 Dilleri Değiştir
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Çevrilecek Metin</label>
              <Button
                onClick={() => speakText(translationText, sourceLang)}
                variant="ghost"
                size="sm"
                className="p-1"
                disabled={!translationText.trim()}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={translationText}
              onChange={(e) => setTranslationText(e.target.value)}
              placeholder="Çevirmek istediğiniz metni buraya yazın..."
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-500">{translationText.length}/500</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={translateText}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2"
              disabled={!translationText.trim() || isTranslating || sourceLang === targetLang}
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Languages className="h-4 w-4 mr-2" />
              )}
              {isTranslating ? "Çevriliyor..." : "Çevir"}
            </Button>
          </div>

          {translatedText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Çeviri Sonucu</label>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => speakText(translatedText, targetLang)}
                    variant="ghost"
                    size="sm"
                    className="p-1"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(translatedText)}
                    variant="ghost"
                    size="sm"
                    className="p-1"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800">{translatedText}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium text-gray-800 mb-3 flex items-center">
              <span className="mr-2">💬</span>
              Sık Kullanılan İfadeler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {commonPhrases.map((phrase, index) => (
                <div 
                  key={index} 
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setTranslationText(phrase[sourceLang] || phrase.tr);
                    setTranslatedText(phrase[targetLang] || phrase.en);
                  }}
                >
                  <div className="text-sm">
                    <div className="font-medium text-gray-800 mb-1 flex items-center justify-between">
                      <span>{phrase[sourceLang] || phrase.tr}</span>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(phrase[sourceLang] || phrase.tr, sourceLang);
                        }}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-gray-600 flex items-center justify-between">
                      <span>{phrase[targetLang] || phrase.en}</span>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(phrase[targetLang] || phrase.en, targetLang);
                        }}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📚</span>
              Çeviri İpuçları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">🎯 Doğru Çeviri için</h4>
                <p className="text-blue-700 text-sm">Kısa ve anlaşılır cümleler kullanın. Uzun metinler yerine paragraf paragraf çevirin.</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">🗣️ Sesli Okuma</h4>
                <p className="text-green-700 text-sm">Çevirilen metinleri sesli dinlemek için sağ üstteki ses butonunu kullanın.</p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-1">📋 Kopyalama</h4>
                <p className="text-purple-700 text-sm">Çevirilen metni kopyala butonuyla hızlıca kopyalayabilirsiniz.</p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-1">🔄 Hızlı Değişim</h4>
                <p className="text-orange-700 text-sm">Dil değiştir butonuyla kaynak ve hedef dilleri hızlıca değiştirebilirsiniz.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
