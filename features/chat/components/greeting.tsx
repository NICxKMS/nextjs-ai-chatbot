export function Greeting() {
	return (
		<div
			className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
			data-testid="greeting"
		>
			<div
				className="animate-fade-in-up-delayed font-semibold text-xl md:text-2xl"
				style={{ animationDelay: "0.15s" }}
			>
				Hello there!
			</div>
			<div
				className="animate-fade-in-up-delayed text-xl text-zinc-500 md:text-2xl"
				style={{ animationDelay: "0.25s" }}
			>
				How can I help you today?
			</div>
		</div>
	)
}
