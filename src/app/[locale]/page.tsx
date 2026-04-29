import fs from 'fs';
import path from 'path';
import Script from 'next/script';

export default function LandingPage() {
  const htmlFilePath = path.join(process.cwd(), 'public', 'landing.html');
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

  // Extract only the <body> inner content (strip DOCTYPE, html, head, body tags)
  let bodyContent = htmlContent;
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }

  // Extract inline <script> blocks from the body content and separate them
  const scriptBlocks: string[] = [];
  bodyContent = bodyContent.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_match, code) => {
    scriptBlocks.push(code);
    return '';
  });

  // Remove <script src="..."> tags (we'll load them via next/script)
  const srcScripts: string[] = [];
  bodyContent = bodyContent.replace(/<script\s+[^>]*src="([^"]*)"[^>]*><\/script>/gi, (_match, src) => {
    srcScripts.push(src);
    return '';
  });

  return (
    <>
      {/* Head assets from the original landing.html <head> */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;900&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/landing-style.css" />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
      {srcScripts.map((src, i) => (
        <Script key={`src-${i}`} src={src} strategy="afterInteractive" />
      ))}
      {scriptBlocks.map((code, i) => (
        <Script key={`inline-${i}`} id={`landing-inline-${i}`} strategy="afterInteractive">
          {code}
        </Script>
      ))}
    </>
  );
}

export async function generateMetadata() {
  return {
    title: 'SyncloudPOS – Logiciel de Caisse & Gestion Commerciale pour l\'Algérie',
    description: 'SyncloudPOS, le logiciel de caisse tout-en-un pour les commerces algériens. POS, stock, clients, fournisseurs, finances, IA. Essai gratuit 7 jours.',
    keywords: 'logiciel de caisse Algérie, POS Algérie, gestion de stock, SyncloudPOS, gestion commerciale Algérie',
    authors: [{ name: 'SyncloudPOS' }],
    openGraph: {
      title: 'SyncloudPOS – Logiciel de Caisse Intelligent pour l\'Algérie',
      description: 'Gérez votre commerce algérien avec SyncloudPOS. POS, stock, clients, finances, IA.',
      type: 'website',
    },
  };
}