'use client';

import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Play, ClipboardCopy, Undo, Redo, MessageSquare, FileText } from 'lucide-react';

import { Artifact } from './base';
import { Console } from '../components/editors';
import type { ArtifactContentProps, ConsoleOutput, ConsoleOutputContent } from '../types';

// ============================================================================
// Dynamic Imports
// ============================================================================

const CodeEditor = dynamic(
  () => import('../components/editors').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="px-3 py-2 text-muted-foreground text-xs">Loading editor…</div>
    ),
  }
);

// ============================================================================
// Pyodide Configuration
// ============================================================================

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
let pyodideScriptPromise: Promise<void> | null = null;

type LoadPyodideFn = (options: { indexURL: string }) => Promise<unknown>;

function loadPyodideScript(): Promise<void> {
  if (pyodideScriptPromise) {
    return pyodideScriptPromise;
  }

  const win = window as unknown as { loadPyodide?: LoadPyodideFn };
  if (typeof win.loadPyodide === 'function') {
    return Promise.resolve();
  }

  pyodideScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PYODIDE_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Pyodide'));
    document.head.appendChild(script);
  });

  return pyodideScriptPromise;
}

// ============================================================================
// Output Handlers for Python
// ============================================================================

const OUTPUT_HANDLERS = {
  matplotlib: `
import io
import base64
from matplotlib import pyplot as plt

plt.clf()
plt.close('all')
plt.switch_backend('agg')

def setup_matplotlib_output():
    def custom_show():
        if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
            print("Warning: Plot size too large, reducing quality")
            plt.gcf().set_dpi(100)

        png_buf = io.BytesIO()
        plt.savefig(png_buf, format='png')
        png_buf.seek(0)
        png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
        print(f'data:image/png;base64,{png_base64}')
        png_buf.close()

        plt.clf()
        plt.close('all')

    plt.show = custom_show
`,
  basic: '# Basic output capture setup',
};

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ['basic'];
  if (code.includes('matplotlib') || code.includes('plt.')) {
    handlers.push('matplotlib');
  }
  return handlers;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Code Artifact Metadata
// ============================================================================

type CodeMetadata = {
  outputs: ConsoleOutput[];
};

// ============================================================================
// Code Artifact Definition
// ============================================================================

export const codeArtifact = new Artifact<'code', CodeMetadata>({
  kind: 'code',
  description: 'Useful for code generation; Code execution is only available for python code.',
  initialize: ({ setMetadata }) => {
    setMetadata({
      outputs: [],
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'data-codeDelta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data as string,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },
  content: ({
    content,
    status,
    isCurrentVersion,
    onSaveContent,
    metadata,
    setMetadata,
  }: ArtifactContentProps<CodeMetadata>) => {
    return (
      <>
        <div className="px-1">
          <CodeEditor
            content={content}
            status={status}
            onSaveContent={onSaveContent}
            isCurrentVersion={isCurrentVersion}
          />
        </div>

        {metadata?.outputs && (
          <Console
            consoleOutputs={metadata.outputs}
            setConsoleOutputs={() => {
              setMetadata({
                ...metadata,
                outputs: [],
              });
            }}
          />
        )}
      </>
    );
  },
  actions: [
    {
      icon: <Play size={18} />,
      label: 'Run',
      description: 'Execute code',
      onClick: async ({ content, setMetadata }) => {
        const runId = generateUUID();
        const outputContent: ConsoleOutputContent[] = [];

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              id: runId,
              contents: [],
              status: 'in_progress',
            },
          ],
        }));

        try {
          await loadPyodideScript();

          const win = window as unknown as { loadPyodide: LoadPyodideFn };
          const currentPyodideInstance = (await win.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
          })) as {
            setStdout: (config: { batched: (output: string) => void }) => void;
            loadPackagesFromImports: (
              code: string,
              options: { messageCallback: (message: string) => void }
            ) => Promise<void>;
            runPythonAsync: (code: string) => Promise<unknown>;
          };

          currentPyodideInstance.setStdout({
            batched: (output: string) => {
              outputContent.push({
                type: output.startsWith('data:image/png;base64') ? 'image' : 'text',
                value: output,
              });
            },
          });

          await currentPyodideInstance.loadPackagesFromImports(content, {
            messageCallback: (message: string) => {
              setMetadata((metadata) => ({
                ...metadata,
                outputs: [
                  ...metadata.outputs.filter((output) => output.id !== runId),
                  {
                    id: runId,
                    contents: [{ type: 'text', value: message }],
                    status: 'loading_packages',
                  },
                ],
              }));
            },
          });

          const requiredHandlers = detectRequiredHandlers(content);
          for (const handler of requiredHandlers) {
            if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
              await currentPyodideInstance.runPythonAsync(
                OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]
              );

              if (handler === 'matplotlib') {
                await currentPyodideInstance.runPythonAsync('setup_matplotlib_output()');
              }
            }
          }

          await currentPyodideInstance.runPythonAsync(content);

          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: outputContent,
                status: 'completed',
              },
            ],
          }));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: [{ type: 'text', value: errorMessage }],
                status: 'failed',
              },
            ],
          }));
        }
      },
    },
    {
      icon: <Undo size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <Redo size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <ClipboardCopy size={18} />,
      description: 'Copy code to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageSquare size={18} />,
      description: 'Add comments',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Add comments to the code snippet for understanding',
            },
          ],
        });
      },
    },
    {
      icon: <FileText size={18} />,
      description: 'Add logs',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Add logs to the code snippet for debugging',
            },
          ],
        });
      },
    },
  ],
});
