"use client"

import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { SystemSettingsForm } from "./system-settings-form";

interface SystemSettingsClientProps {
    initialData: {
        blTemplate: string;
        databaseUrl: string;
        geminiApiKey: string | null;
    }
}

export const SystemSettingsClient: React.FC<SystemSettingsClientProps> = ({
    initialData
}) => {
    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title="Paramètres Système" description="Gérez les paramètres techniques de SynthCloud POS." />
            </div>
            <Separator />
            <div className="mt-8 w-full">
                <SystemSettingsForm initialData={initialData} />
            </div>
        </>
    )
}
