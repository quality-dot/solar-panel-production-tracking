/**
 * Mock for html5-qrcode library
 * Provides mock implementations for barcode scanning functionality
 */

export const Html5Qrcode = jest.fn().mockImplementation(() => ({
  getCameras: jest.fn().mockResolvedValue([
    { id: 'camera1', label: 'Front Camera' },
    { id: 'camera2', label: 'Back Camera' },
  ]),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getState: jest.fn().mockReturnValue(0), // NOT_STARTED
  isScanning: jest.fn().mockReturnValue(false),
}));

export const Html5QrcodeSupportedFormats = {
  QR_CODE: 'QR_CODE',
  AZTEC: 'AZTEC',
  CODABAR: 'CODABAR',
  CODE_39: 'CODE_39',
  CODE_93: 'CODE_93',
  CODE_128: 'CODE_128',
  DATA_MATRIX: 'DATA_MATRIX',
  MAXICODE: 'MAXICODE',
  PDF_417: 'PDF_417',
  RSS_14: 'RSS_14',
  RSS_EXPANDED: 'RSS_EXPANDED',
  UPC_A: 'UPC_A',
  UPC_E: 'UPC_E',
  UPC_EAN_EXTENSION: 'UPC_EAN_EXTENSION',
};

export const Html5QrcodeScannerState = {
  NOT_STARTED: 0,
  SCANNING: 1,
  PAUSED: 2,
};

export default {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  Html5QrcodeScannerState,
};
