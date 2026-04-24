// file-type v17+ is ESM-only. docu-notion is compiled as CommonJS
// (see tsconfig.json "module": "commonjs"), so a static
// `import from "file-type"` — or even `await import("file-type")` —
// gets transformed by TypeScript into `require()`, which fails on
// ESM-only modules. We use `new Function(...)` to construct a real
// dynamic import that TypeScript does not transform.

export type FileTypeResult = { ext: string; mime: string };

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importFileType = new Function(
  "return import('file-type')"
) as () => Promise<{
  fileTypeFromBuffer: (
    buf: Uint8Array
  ) => Promise<FileTypeResult | undefined>;
}>;

export async function detectFileType(
  buffer: Uint8Array
): Promise<FileTypeResult | undefined> {
  const { fileTypeFromBuffer } = await importFileType();
  return fileTypeFromBuffer(buffer);
}
