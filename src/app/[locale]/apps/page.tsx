import LandingClient from '../landing-client';
import '../landing.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AppsPage({ params }: PageProps) {
  const { locale } = await params;
  return <LandingClient locale={locale} pageType="apps" />;
}

export async function generateMetadata() {
  return {
    title: 'Applications Mobiles – SyncloudPOS',
    description: 'Découvrez SynCloud Gérant et SynCloud Tournée, les applications mobiles pour suivre vos ventes et vos livraisons sur le terrain.',
  };
}
