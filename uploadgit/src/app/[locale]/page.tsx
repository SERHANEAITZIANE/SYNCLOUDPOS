import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const t = useTranslations('HomePage');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="text-xl text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg">Se connecter</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline" size="lg">Tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
