import type { ModelMetadata } from "@/lib/ai/model-catalog-types";

type GreetingProps = {
    availableModels?: ModelMetadata[];
};

export const Greeting = ({ availableModels }: GreetingProps) => {
    const modelCount = availableModels?.length ?? 0;

    return (
        <div
            className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
            key="overview"
        >
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
                {modelCount > 0
                    ? `How can I help you today? You have access to ${modelCount} models.`
                    : "How can I help you today?"}
            </div>
        </div>
    );
};
