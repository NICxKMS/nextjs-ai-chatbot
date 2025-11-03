"use client";

import type { DataUIPart } from "ai";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import type { CustomUIDataTypes } from "@/lib/types";

type DataStreamContextValue = {
	getDataStream: () => DataUIPart<CustomUIDataTypes>[];
	appendDataPart: (part: DataUIPart<CustomUIDataTypes>) => void;
	resetDataStream: () => void;
	subscribe: (listener: () => void) => () => void;
	getVersion: () => number;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const dataStreamRef = useRef<DataUIPart<CustomUIDataTypes>[]>([]);
	const listenersRef = useRef(new Set<() => void>());
	const versionRef = useRef(0);

	const notifyListeners = useCallback(() => {
		versionRef.current += 1;
		for (const listener of listenersRef.current) {
			listener();
		}
	}, []);

	const appendDataPart = useCallback(
		(part: DataUIPart<CustomUIDataTypes>) => {
			dataStreamRef.current.push(part);
			notifyListeners();
		},
		[notifyListeners]
	);

	const resetDataStream = useCallback(() => {
		if (dataStreamRef.current.length === 0) {
			return;
		}
		dataStreamRef.current = [];
		notifyListeners();
	}, [notifyListeners]);

	const subscribe = useCallback((listener: () => void) => {
		listenersRef.current.add(listener);
		return () => {
			listenersRef.current.delete(listener);
		};
	}, []);

	const getVersion = useCallback(() => versionRef.current, []);

	const getDataStream = useCallback(() => dataStreamRef.current, []);

	const value = useMemo<DataStreamContextValue>(
		() => ({
			getDataStream,
			appendDataPart,
			resetDataStream,
			subscribe,
			getVersion,
		}),
		[appendDataPart, resetDataStream, subscribe, getVersion, getDataStream]
	);

	return (
		<DataStreamContext.Provider value={value}>
			{children}
		</DataStreamContext.Provider>
	);
}

export function useDataStream() {
	const context = useContext(DataStreamContext);

	if (!context) {
		throw new Error(
			"useDataStream must be used within a DataStreamProvider"
		);
	}

	const { subscribe, getVersion, ...rest } = context;
	const version = useSyncExternalStore(subscribe, getVersion, getVersion);

	return {
		...rest,
		version,
	};
}
