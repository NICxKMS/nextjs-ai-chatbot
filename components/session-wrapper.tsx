import { SessionProvider } from "next-auth/react";
import { auth } from "@/app/(auth)/auth";

export async function SessionWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	return (
		<SessionProvider
			refetchInterval={0}
			refetchOnWindowFocus={false}
			refetchWhenOffline={false}
			session={session}
		>
			{children}
		</SessionProvider>
	);
}
