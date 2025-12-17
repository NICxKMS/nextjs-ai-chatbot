export function Greeting() {
    return (
        <div
            className="mx-auto mt-4 flex size-full min-h-[120px] max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
            key="overview"
        >
            <div className="greeting-line greeting-line-1 font-semibold text-xl md:text-2xl">
                Hello there!
            </div>
            <div className="greeting-line greeting-line-2 text-xl text-zinc-500 md:text-2xl">
                How can I help you today?
            </div>
        </div>
    );
}
