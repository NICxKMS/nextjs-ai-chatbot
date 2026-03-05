export function Greeting() {
	return (
		<div className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8">
			<div
				className="animate-fade-in-up-delayed font-semibold text-xl md:text-2xl"
				style={{ animationDelay: "0.5s" }}
			>
				Hello there!
			</div>
			<div
				className="animate-fade-in-up-delayed text-xl text-zinc-500 md:text-2xl"
				style={{ animationDelay: "0.6s" }}
			>
				How can I help you today?
			</div>
		</div>
	)
}
