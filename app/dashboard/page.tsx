import { Button } from "@/components/ui/button";
import { signOut, withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { hasLinearConnected, getLinearClient } from "@/lib/linear/client";
import { hasATSContainer } from "@/lib/linear/initiatives";
import { checkATSContainerToneOfVoice } from "@/lib/linear/initiatives-actions";
import { ToneOfVoiceSetup } from "@/components/tone-of-voice-setup";
import { RedisTokenStatus } from "@/components/redis-token-status";
import { hasOrgConfig } from "@/lib/redis";

export default async function DashboardPage() {
    const { user } = await withAuth({ ensureSignedIn: true });

    // Check if Linear is connected
    const linearConnected = await hasLinearConnected();
    
    if (!linearConnected) {
        redirect('/api/linear/authorize');
    }

    // Check if onboarding is complete
    const hasContainer = await hasATSContainer();
    
    if (!hasContainer) {
        redirect('/onboarding');
    }

    // Check if Tone of Voice document exists
    const { hasToneOfVoice } = await checkATSContainerToneOfVoice();

    // Get Linear organization info and check Redis config status
    const client = await getLinearClient();
    const organization = await client.organization;
    const configSaved = await hasOrgConfig(organization.name);

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Welcome {user.firstName}!</h1>
                    <form action={async function signout() {
                        "use server";
                        await signOut();
                    }}>
                        <Button type="submit" variant="outline">Sign out</Button>
                    </form>
                </div>

                {!hasToneOfVoice && <ToneOfVoiceSetup />}

                <RedisTokenStatus 
                    initialHasConfig={configSaved}
                    orgId={organization.id}
                    orgName={organization.name}
                />

                <div className="border rounded-lg p-6">
                    <p className="text-muted-foreground">
                        Your ATS is ready to use. Start creating job descriptions and managing candidates.
                    </p>
                </div>
            </div>
        </div>
    );
}