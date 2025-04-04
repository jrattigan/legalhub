declare module './NativeDocViewer' {
  import { FC } from 'react';
  
  export interface NativeDocViewerProps {
    documentUrl: string;
    documentType?: string;
  }
  
  const NativeDocViewer: FC<NativeDocViewerProps>;
  export default NativeDocViewer;
}