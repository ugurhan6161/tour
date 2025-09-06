import { notFound } from "next/navigation";
import PublicTracking from "@/components/public/public-tracking";

interface TrackPageProps {
  params: Promise<{
    trackingCode: string;
  }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  // In Next.js 15, we need to properly await the params
  const { trackingCode } = await params;

  // Basic validation
  if (!trackingCode || trackingCode.length < 6) {
    notFound();
  }

  return <PublicTracking trackingCode={trackingCode} />;
}

// Generate metadata for the page
export async function generateMetadata({ params }: TrackPageProps) {
  const { trackingCode } = await params;
  
  return {
    title: `Seyahat Takip - ${trackingCode}`,
    description: 'Seyahatinizi gerçek zamanlı olarak takip edin - Track your trip in real-time',
    robots: 'noindex, nofollow', // Don't index tracking pages
  };
}

// For static export, we need to generate static params
// This is a placeholder - in a real app, you would fetch actual tracking codes
export async function generateStaticParams() {
  return [
    { trackingCode: 'SAMPLE001' },
    { trackingCode: 'SAMPLE002' },
    { trackingCode: 'SAMPLE003' },
  ];
}