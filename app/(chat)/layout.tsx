import { ChatLayoutClient } from "./chat-layout-client";

export default function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ChatLayoutClient>{children}</ChatLayoutClient>;
}
