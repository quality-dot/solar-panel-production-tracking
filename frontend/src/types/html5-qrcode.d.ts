declare module 'html5-qrcode' {
  export interface Html5QrcodeConfig {
    fps: number;
    qrbox?: {
      width: number;
      height: number;
    };
    aspectRatio?: number;
    disableFlip?: boolean;
  }

  export interface Html5QrcodeResult {
    decodedText: string;
    result: {
      text: string;
      format: string;
    };
  }

  export interface Html5QrcodeError {
    type: string;
    message: string;
  }

  export class Html5Qrcode {
    constructor(elementId: string);
    
    start(
      cameraId: string,
      config: Html5QrcodeConfig,
      onScanSuccess: (decodedText: string, result: any) => void,
      onScanError: (error: Html5QrcodeError) => void
    ): Promise<void>;
    
    stop(): Promise<void>;
    
    getCameras(): Promise<Array<{ id: string; label: string }>>;
    
    isScanning(): boolean;
    
    clear(): void;
  }

  export default Html5Qrcode;
}
