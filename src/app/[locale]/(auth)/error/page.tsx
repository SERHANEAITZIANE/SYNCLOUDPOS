import { Link } from "@/i18n/routing"
import { Card, CardHeader, CardFooter, CardContent } from "@/components/ui/card"

export default function AuthErrorPage() {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-100">
            <Card className="w-[400px] shadow-md">
                <CardHeader>
                    <div className="flex w-full flex-col gap-y-4 items-center justify-center">
                        <h1 className="text-3xl font-semibold">⚠ Error</h1>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center text-destructive">
                        <p>Something went wrong during authentication.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Link href="/login" className="w-full text-center hover:underline">
                        Back to login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
