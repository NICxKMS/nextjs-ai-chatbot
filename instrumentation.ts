import { registerOTel } from "@vercel/otel";

export function register() {
	// Enhanced configuration for Vercel Fluid Compute tracing
	registerOTel({ 
		serviceName: "ai-chatbot",
	});
}
