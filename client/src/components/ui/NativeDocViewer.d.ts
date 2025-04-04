import { FC } from 'react';

export interface NativeDocViewerProps {
  documentUrl: string;
  documentType?: string;
}

declare const NativeDocViewer: FC<NativeDocViewerProps>;
export default NativeDocViewer;

declare module 'docx-preview' {
  export interface RenderOptions {
    className?: string;
    inWrapper?: boolean;
    ignoreLastRenderedPageBreak?: boolean;
    useBase64URL?: boolean;
    renderHeaders?: boolean;
    renderFooters?: boolean;
    renderFootnotes?: boolean;
    renderEndnotes?: boolean;
    experimental?: boolean;
  }

  export function renderAsync(
    document: ArrayBuffer,
    container: HTMLElement,
    styleMap?: object,
    options?: RenderOptions
  ): Promise<void>;
}