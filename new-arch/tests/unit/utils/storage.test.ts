import { beforeEach, describe, expect, it } from "vitest";

import {
    clearAll,
    clearSession,
    getItem,
    getKeys,
    getSessionItem,
    getSessionKeys,
    hasItem,
    hasSessionItem,
    removeItem,
    removeSessionItem,
    setItem,
    setSessionItem,
} from "@/lib/utils/storage";

describe("Storage Utilities", () => {
    // =========================================================================
    // localStorage Utilities
    // =========================================================================

    describe("localStorage - getItem", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("returns stored value when key exists", () => {
            localStorage.setItem("test", JSON.stringify({ name: "John" }));
            const result = getItem<{ name: string }>("test", {
                name: "default",
            });
            expect(result).toEqual({ name: "John" });
        });

        it("returns fallback when key does not exist", () => {
            const result = getItem<string>("nonexistent", "default");
            expect(result).toBe("default");
        });

        it("returns fallback when stored value is invalid JSON", () => {
            localStorage.setItem("invalid", "not json{");
            const result = getItem<string>("invalid", "default");
            expect(result).toBe("default");
        });

        it("handles various types", () => {
            localStorage.setItem("number", JSON.stringify(42));
            localStorage.setItem("array", JSON.stringify([1, 2, 3]));
            localStorage.setItem("boolean", JSON.stringify(true));

            expect(getItem<number>("number", 0)).toBe(42);
            expect(getItem<number[]>("array", [])).toEqual([1, 2, 3]);
            expect(getItem<boolean>("boolean", false)).toBe(true);
        });

        it("returns null when stored as JSON null", () => {
            localStorage.setItem("null", JSON.stringify(null));
            expect(getItem("null", "default")).toBeNull();
        });
    });

    describe("localStorage - setItem", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("stores value as JSON", () => {
            setItem("user", { name: "John", id: 123 });
            const stored = localStorage.getItem("user");
            expect(stored).toBe('{"name":"John","id":123}');
        });

        it("stores primitive values", () => {
            setItem("count", 42);
            setItem("active", true);
            setItem("name", "test");

            expect(localStorage.getItem("count")).toBe("42");
            expect(localStorage.getItem("active")).toBe("true");
            expect(localStorage.getItem("name")).toBe('"test"');
        });

        it("stores array values", () => {
            setItem("items", [1, 2, 3]);
            expect(localStorage.getItem("items")).toBe("[1,2,3]");
        });

        it("overwrites existing values", () => {
            setItem("key", "value1");
            setItem("key", "value2");
            expect(getItem<string>("key", "")).toBe("value2");
        });
    });

    describe("localStorage - removeItem", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("removes existing item", () => {
            localStorage.setItem("test", "value");
            removeItem("test");
            expect(localStorage.getItem("test")).toBeNull();
        });

        it("does nothing when key does not exist", () => {
            removeItem("nonexistent");
            // Should not throw
            expect(localStorage.getItem("nonexistent")).toBeNull();
        });
    });

    describe("localStorage - hasItem", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("returns true when key exists", () => {
            localStorage.setItem("test", "value");
            expect(hasItem("test")).toBe(true);
        });

        it("returns false when key does not exist", () => {
            expect(hasItem("nonexistent")).toBe(false);
        });
    });

    describe("localStorage - getKeys", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("returns all keys", () => {
            localStorage.setItem("key1", "value1");
            localStorage.setItem("key2", "value2");
            localStorage.setItem("key3", "value3");

            const keys = getKeys();
            expect(keys).toHaveLength(3);
            expect(keys).toContain("key1");
            expect(keys).toContain("key2");
            expect(keys).toContain("key3");
        });

        it("returns empty array when storage is empty", () => {
            expect(getKeys()).toEqual([]);
        });
    });

    describe("localStorage - clearAll", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("clears all items", () => {
            localStorage.setItem("key1", "value1");
            localStorage.setItem("key2", "value2");

            clearAll();

            expect(localStorage.length).toBe(0);
        });

        it("does nothing when storage is empty", () => {
            clearAll();
            expect(localStorage.length).toBe(0);
        });
    });

    // =========================================================================
    // sessionStorage Utilities
    // =========================================================================

    describe("sessionStorage - getSessionItem", () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it("returns stored value when key exists", () => {
            sessionStorage.setItem(
                "session-test",
                JSON.stringify({ name: "Session" })
            );
            const result = getSessionItem<{ name: string }>("session-test", {
                name: "default",
            });
            expect(result).toEqual({ name: "Session" });
        });

        it("returns fallback when key does not exist", () => {
            const result = getSessionItem<string>("nonexistent", "fallback");
            expect(result).toBe("fallback");
        });

        it("returns fallback when stored value is invalid JSON", () => {
            sessionStorage.setItem("invalid", "{not valid json");
            const result = getSessionItem<string>("invalid", "fallback");
            expect(result).toBe("fallback");
        });
    });

    describe("sessionStorage - setSessionItem", () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it("stores value as JSON", () => {
            setSessionItem("session-user", { id: 456 });
            const stored = sessionStorage.getItem("session-user");
            expect(stored).toBe('{"id":456}');
        });

        it("stores various types", () => {
            setSessionItem("num", 123);
            setSessionItem("arr", [1, 2]);
            setSessionItem("bool", false);

            expect(sessionStorage.getItem("num")).toBe("123");
            expect(sessionStorage.getItem("arr")).toBe("[1,2]");
            expect(sessionStorage.getItem("bool")).toBe("false");
        });
    });

    describe("sessionStorage - removeSessionItem", () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it("removes existing item", () => {
            sessionStorage.setItem("to-remove", "value");
            removeSessionItem("to-remove");
            expect(sessionStorage.getItem("to-remove")).toBeNull();
        });
    });

    describe("sessionStorage - hasSessionItem", () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it("returns true when key exists", () => {
            sessionStorage.setItem("exists", "value");
            expect(hasSessionItem("exists")).toBe(true);
        });

        it("returns false when key does not exist", () => {
            expect(hasSessionItem("does-not-exist")).toBe(false);
        });
    });

    describe("sessionStorage - getSessionKeys", () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it("returns all session keys", () => {
            sessionStorage.setItem("s1", "v1");
            sessionStorage.setItem("s2", "v2");

            const keys = getSessionKeys();
            expect(keys).toHaveLength(2);
            expect(keys).toContain("s1");
            expect(keys).toContain("s2");
        });

        it("returns empty array when session storage is empty", () => {
            expect(getSessionKeys()).toEqual([]);
        });
    });

    describe("sessionStorage - clearSession", () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it("clears all session items", () => {
            sessionStorage.setItem("s1", "v1");
            sessionStorage.setItem("s2", "v2");

            clearSession();

            expect(sessionStorage.length).toBe(0);
        });
    });

    // =========================================================================
    // Cross-Storage Independence
    // =========================================================================

    describe("Storage Independence", () => {
        beforeEach(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        it("localStorage and sessionStorage are independent", () => {
            setItem("shared-key", "local-value");
            setSessionItem("shared-key", "session-value");

            expect(getItem<string>("shared-key", "")).toBe("local-value");
            expect(getSessionItem<string>("shared-key", "")).toBe(
                "session-value"
            );
        });

        it("clearing localStorage does not affect sessionStorage", () => {
            setItem("local", "value");
            setSessionItem("session", "value");

            clearAll();

            expect(hasItem("local")).toBe(false);
            expect(hasSessionItem("session")).toBe(true);
        });

        it("clearing sessionStorage does not affect localStorage", () => {
            setItem("local", "value");
            setSessionItem("session", "value");

            clearSession();

            expect(hasItem("local")).toBe(true);
            expect(hasSessionItem("session")).toBe(false);
        });
    });
});
