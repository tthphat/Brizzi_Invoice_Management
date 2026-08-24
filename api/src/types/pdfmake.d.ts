declare module "pdfmake" {
  export interface PdfOutputDocument {
    getBuffer(): Promise<Buffer>;
    write(filename: string): Promise<void>;
    getBase64(): Promise<string>;
  }

  export type FontDescriptors = Record<string, Record<string, string>>;

  export interface PdfMakeInstance {
    addFonts(fonts: FontDescriptors): void;
    setFonts(fonts: FontDescriptors): void;
    clearFonts(): void;
    createPdf(
      docDefinition: Record<string, unknown>,
      options?: Record<string, unknown>,
    ): PdfOutputDocument;
  }

  const pdfmake: PdfMakeInstance;
  export default pdfmake;
}
