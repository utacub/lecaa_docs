declare const __SINGLE_FILE__: boolean;

declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    setFonts(fonts: Record<string, Record<string, string>>): void;
    createPdf(doc: Record<string, unknown>): { getBlob(): Promise<Blob> };
  };
  export default pdfMake;
}
