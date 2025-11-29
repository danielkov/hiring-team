import { Button } from "@/components/ui/button";
import { signOut, withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { hasLinearConnected } from "@/lib/linear/client";
import { hasATSContainer } from "@/lib/linear/initiatives";

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

    return <div><p>Welcome {user.firstName}!</p><form action={async function signout() {
        "use server";
        await signOut();
    }}><Button type="submit">Sign out</Button></form></div>
}