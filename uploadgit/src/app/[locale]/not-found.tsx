import { Link } from '@/i18n/routing';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
            <p className="mb-4">Could not find requested resource</p>
            <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Return Home
            </Link>
        </div>
    )
}
