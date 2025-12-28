import { cookies, headers } from "next/headers";
import { ChatLayoutClient } from "./chat-layout-client";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const headersList = await headers();
    const cookieStore = await cookies();

    const isMobile = headersList.get("x-device-type") === "mobile";
    const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

    return (
        <ChatLayoutClient
            initialIsMobile={isMobile}
            initialSidebarOpen={sidebarOpen}
        >
            {children}
        </ChatLayoutClient>
    );
}
