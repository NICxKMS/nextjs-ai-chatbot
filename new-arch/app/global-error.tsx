"use client";

import NextError from "next/error";

type GlobalErrorProps = {
    error: Error & { digest?: string };
};

export default function GlobalError({ error }: GlobalErrorProps) {
    // Error object intentionally unused - digest displayed via NextError
    // Stack traces not exposed in production client bundle
    console.debug(error.digest);

    return (
        <html lang="en">
            <body>
                {/* `NextError` is the default Next.js error page component.
                    Its type definition requires a `statusCode` prop.
                    Since the App Router does not expose status codes for errors,
                    we pass 0 to render a generic error message. */}
                <NextError statusCode={0} />
            </body>
        </html>
    );
}
