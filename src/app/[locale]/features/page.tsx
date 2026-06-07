import LandingClient from '../landing-client';
import '../landing.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function FeaturesPage({ params }: PageProps) {
  const { locale } = await params;
  return <LandingClient locale={locale} pageType="features" />;
}

export async function generateMetadata() {
  return {
    title: 'Fonctionnalités – SyncloudPOS',
    description: 'Explorez plus de 120 fonctionnalités intelligentes de SyncloudPOS pour les commerces algériens: caisse POS, stock, clients, finances, et IA.',
  };
}
// Trigger rebuild for CSS changes

