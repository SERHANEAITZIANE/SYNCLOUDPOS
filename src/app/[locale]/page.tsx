import fs from 'fs';
import path from 'path';
export default function LandingPage() {
  const htmlFilePath = path.join(process.cwd(), 'public', 'landing.html');
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}