import React from 'react';
import { useParams } from 'react-router-dom';
import StationWorkflow from '../components/StationWorkflow';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export default function Station() {
  const { stationId } = useParams<{ stationId: string }>();
  
  if (!stationId) {
    return (
      <div className="card">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Station</h2>
          <p className="text-gray-600">Station ID is required.</p>
        </div>
      </div>
    );
  }

  const stationIdNumber = parseInt(stationId);
  
  if (isNaN(stationIdNumber)) {
    return (
      <div className="card">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Station ID</h2>
          <p className="text-gray-600">Station ID must be a valid number.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredStationAccess={stationIdNumber}>
      <div className="space-y-6">
        <div className="lg:hidden">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Station {stationId}</h1>
          <p className="text-gray-600">Manufacturing station workflow and barcode scanning</p>
        </div>
        
        <StationWorkflow stationId={stationIdNumber} />
      </div>
    </ProtectedRoute>
  );
}
