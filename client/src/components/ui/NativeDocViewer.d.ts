declare module './NativeDocViewer' {
  interface NativeDocViewerProps {
    documentUrl: string;
    documentType?: string;
  }
  
  export default function NativeDocViewer(props: NativeDocViewerProps): JSX.Element;
}