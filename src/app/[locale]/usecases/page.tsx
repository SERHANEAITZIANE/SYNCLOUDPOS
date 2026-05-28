import LandingClient from '../landing-client';
import '../landing.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function UseCasesPage({ params }: PageProps) {
  const { locale } = await params;
  return <LandingClient locale={locale} pageType="usecases" />;
}

export async function generateMetadata() {
  return {
    title: "Cas d'usage – SyncloudPOS",
    description: 'SyncloudPOS s’adapte à votre secteur d’activité en Algérie: grossistes, hypermarchés, boutiques, ateliers, pharmacies.',
  };
}
