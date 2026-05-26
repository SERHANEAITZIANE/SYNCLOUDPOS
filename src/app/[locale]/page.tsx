import LandingClient from './landing-client';
import './landing.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params;
  return <LandingClient locale={locale} />;
}

export async function generateMetadata() {
  return {
    title: 'SyncloudPOS – Logiciel de Caisse & Gestion Commerciale pour l\'Algérie',
    description:
      'SyncloudPOS, le logiciel de caisse tout-en-un pour les commerces algériens. POS, stock, clients, fournisseurs, finances, IA, applications mobiles. Essai gratuit 7 jours.',
    keywords:
      'logiciel de caisse Algérie, POS Algérie, gestion de stock, SyncloudPOS, gestion commerciale Algérie, application mobile gérant, tournée livreur',
    authors: [{ name: 'SyncloudPOS' }],
    openGraph: {
      title: 'SyncloudPOS – Logiciel de Caisse Intelligent pour l\'Algérie',
      description:
        'Gérez votre commerce algérien avec SyncloudPOS. POS, stock, clients, finances, IA, applications mobiles gérant et tournée.',
      type: 'website',
    },
  };
}