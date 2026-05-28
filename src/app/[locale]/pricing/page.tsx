import LandingClient from '../landing-client';
import '../landing.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PricingPage({ params }: PageProps) {
  const { locale } = await params;
  return <LandingClient locale={locale} pageType="pricing" />;
}

export async function generateMetadata() {
  return {
    title: 'Tarifs – SyncloudPOS',
    description: 'Découvrez nos tarifs transparents et demandez votre devis personnalisé pour votre commerce en Algérie.',
  };
}
