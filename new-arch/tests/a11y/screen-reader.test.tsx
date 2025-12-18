import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Screen Reader Announcements", () => {
    const LiveRegion = ({ message }: { message: string }) => (
        <output aria-atomic="true" aria-live="polite">
            {message}
        </output>
    );

    const AlertRegion = ({ error }: { error: string }) => (
        <div aria-live="assertive" role="alert">
            {error}
        </div>
    );

    const LoadingState = ({ isLoading }: { isLoading: boolean }) => (
        <div>
            {isLoading && (
                <output aria-busy="true" aria-label="Loading messages">
                    <span className="sr-only">Loading...</span>
                </output>
            )}
        </div>
    );

    describe("Live Regions", () => {
        it("status region is polite", () => {
            render(<LiveRegion message="3 new messages" />);
            const region = screen.getByRole("status");
            expect(region).toHaveAttribute("aria-live", "polite");
        });

        it("alert region is assertive", () => {
            render(<AlertRegion error="Connection lost" />);
            const alert = screen.getByRole("alert");
            expect(alert).toHaveAttribute("aria-live", "assertive");
        });

        it("atomic updates announce full content", () => {
            render(<LiveRegion message="Updated count" />);
            const region = screen.getByRole("status");
            expect(region).toHaveAttribute("aria-atomic", "true");
        });
    });

    describe("Loading States", () => {
        it("announces loading state", () => {
            render(<LoadingState isLoading={true} />);
            const loading = screen.getByRole("status");
            expect(loading).toHaveAttribute("aria-busy", "true");
            expect(loading).toHaveAttribute("aria-label");
        });

        it("has visually hidden text", () => {
            render(<LoadingState isLoading={true} />);
            expect(screen.getByText("Loading...")).toHaveClass("sr-only");
        });
    });

    describe("Skip Links", () => {
        const PageWithSkipLink = () => (
            <div>
                <a className="sr-only focus:not-sr-only" href="#main-content">
                    Skip to main content
                </a>
                <nav>Navigation</nav>
                <main id="main-content" tabIndex={-1}>
                    Main content
                </main>
            </div>
        );

        it("has skip link", () => {
            render(<PageWithSkipLink />);
            expect(
                screen.getByText("Skip to main content")
            ).toBeInTheDocument();
        });

        it("skip link targets main", () => {
            render(<PageWithSkipLink />);
            const link = screen.getByText("Skip to main content");
            expect(link).toHaveAttribute("href", "#main-content");
        });

        it("main is focusable", () => {
            render(<PageWithSkipLink />);
            const main = screen.getByRole("main");
            expect(main).toHaveAttribute("tabIndex", "-1");
        });
    });
});
