// Type definitions for NativeDocViewer component
import { FC } from 'react';

export interface NativeDocViewerProps {
  documentUrl: string;
  documentType?: string;
}

declare const NativeDocViewer: FC<NativeDocViewerProps>;
export default NativeDocViewer;