// Model exports for manufacturing database operations
// Centralized model exports for the solar panel tracking system

export { 
  User, 
  USER_ROLES,
  default as UserModel 
} from './User.js';

// Database integration models for barcode processing
export { 
  Panel, 
  panelModel,
  PANEL_STATUS,
  PANEL_TYPE,
  LINE_TYPE,
  default as PanelModel 
} from './Panel.js';

export { 
  Station, 
  stationModel,
  STATION_TYPE,
  LINE_TYPE as STATION_LINE_TYPE,
  default as StationModel 
} from './Station.js';

export { 
  ManufacturingOrder, 
  manufacturingOrderModel,
  MO_STATUS,
  PANEL_TYPE as MO_PANEL_TYPE,
  default as ManufacturingOrderModel 
} from './ManufacturingOrder.js';

// Export all models for convenience
export const models = {
  User: User,
  Panel: Panel,
  Station: Station,
  ManufacturingOrder: ManufacturingOrder
};

export default models;

