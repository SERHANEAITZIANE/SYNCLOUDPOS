import LandingClient from '../landing-client';
import '../landing.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  return <LandingClient locale={locale} pageType="contact" />;
}

export async function generateMetadata() {
  return {
    title: 'Contact – SyncloudPOS',
    description: 'Contactez l’équipe SyncloudPOS pour toute demande d’information, support, ou configuration de votre compte.',
  };
}
