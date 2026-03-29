import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { getAuditLogs } from "@/actions/audit-log";
import { AuditLogClient } from "./audit-log-client";

export const metadata = {
    title: "Journal d'Audit | SYNCLOUDPOS",
    description: "Historique des actions critiques pour conformité DGI",
};

export default async function AuditLogPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const session = await auth();
    const { locale } = await params;

    if (!session) {
        redirect({ href: "/login", locale });
    }

    // Only ADMIN and superadmin can access
    if (session.user?.role !== "ADMIN" && !session.user?.isSuperadmin) {
        redirect({ href: "/dashboard", locale });
    }

    const logs = await getAuditLogs({ limit: 200 });

    return <AuditLogClient logs={JSON.parse(JSON.stringify(logs))} />;
}
