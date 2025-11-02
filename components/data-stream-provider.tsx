"use client";

import type { DataUIPart } from "ai";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CustomUIDataTypes } from "@/lib/types";

type DataStreamContextValue = {
  getDataStream: () => DataUIPart<CustomUIDataTypes>[];
  appendDataPart: (part: DataUIPart<CustomUIDataTypes>) => void;
  resetDataStream: () => void;
  version: number;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dataStreamRef = useRef<DataUIPart<CustomUIDataTypes>[]>([]);
  const [version, setVersion] = useState(0);

  const appendDataPart = useCallback(
    (part: DataUIPart<CustomUIDataTypes>) => {
      dataStreamRef.current.push(part);
      setVersion((previous) => previous + 1);
    },
    []
  );

  const resetDataStream = useCallback(() => {
    if (dataStreamRef.current.length === 0) {
      return;
    }
    dataStreamRef.current = [];
    setVersion((previous) => previous + 1);
  }, []);

  const value = useMemo<DataStreamContextValue>(
    () => ({
      getDataStream: () => dataStreamRef.current,
      appendDataPart,
      resetDataStream,
      version,
    }),
    [appendDataPart, resetDataStream, version]
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
    throw new Error("useDataStream must be used within a DataStreamProvider");
  }
  return context;
}
