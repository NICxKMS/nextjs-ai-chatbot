import { render, screen } from "@testing-library/react";
import React, { Profiler, type ProfilerOnRenderCallback } from "react";
import { beforeEach, describe, expect, it } from "vitest";

describe("Rendering Performance", () => {
    // Track render metrics
    const renderMetrics: Array<{
        id: string;
        phase: string;
        actualDuration: number;
        baseDuration: number;
    }> = [];

    const onRender: ProfilerOnRenderCallback = (
        id,
        phase,
        actualDuration,
        baseDuration
    ) => {
        renderMetrics.push({
            id,
            phase,
            actualDuration,
            baseDuration,
        });
    };

    beforeEach(() => {
        renderMetrics.length = 0;
    });

    // Simple test component
    const HeavyList = ({
        items,
    }: {
        items: Array<{ id: string; value: string }>;
    }) => (
        <ul>
            {items.map((item) => (
                <li key={item.id}>{item.value}</li>
            ))}
        </ul>
    );

    describe("Initial Render", () => {
        it("renders 100 items under 100ms", () => {
            const items = Array.from({ length: 100 }, (_, i) => ({
                id: `item-${i}`,
                value: `Item ${i}`,
            }));

            render(
                <Profiler id="heavy-list" onRender={onRender}>
                    <HeavyList items={items} />
                </Profiler>
            );

            const mountRender = renderMetrics.find((m) => m.phase === "mount");
            expect(mountRender?.actualDuration).toBeLessThan(100);
        });

        it("renders 1000 items under 500ms", () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({
                id: `item-${i}`,
                value: `Item ${i}`,
            }));

            render(
                <Profiler id="massive-list" onRender={onRender}>
                    <HeavyList items={items} />
                </Profiler>
            );

            const mountRender = renderMetrics.find((m) => m.phase === "mount");
            expect(mountRender?.actualDuration).toBeLessThan(500);
        });
    });

    describe("Re-render Performance", () => {
        it("memoized components skip unnecessary renders", () => {
            const _MemoizedChild = React.memo(({ text }: { text: string }) => (
                <span>{text}</span>
            ));

            const renderCount = { value: 0 };
            const TrackedChild = React.memo(({ text }: { text: string }) => {
                renderCount.value++;
                return <span>{text}</span>;
            });

            const Parent = ({ count }: { count: number }) => (
                <div>
                    <TrackedChild text="Static" />
                    <span>Count: {count}</span>
                </div>
            );

            const { rerender } = render(<Parent count={0} />);
            const initialRenders = renderCount.value;

            rerender(<Parent count={1} />);

            // Memoized child should not re-render
            expect(renderCount.value).toBe(initialRenders);
        });
    });

    describe("Virtual Scrolling", () => {
        it("only renders visible items", () => {
            const VirtualList = ({
                items: itemList,
                visibleCount,
            }: {
                items: Array<{ id: string; value: string }>;
                visibleCount: number;
            }) => (
                <ul data-testid="virtual-list">
                    {itemList.slice(0, visibleCount).map((item) => (
                        <li key={item.id}>{item.value}</li>
                    ))}
                </ul>
            );

            const items = Array.from({ length: 10_000 }, (_, i) => ({
                id: `virtual-${i}`,
                value: `Item ${i}`,
            }));
            render(<VirtualList items={items} visibleCount={20} />);

            const list = screen.getByTestId("virtual-list");
            expect(list.children.length).toBe(20);
        });
    });
});
