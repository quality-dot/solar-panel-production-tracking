import { ClipboardDocumentCheckIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function Inspections() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inspections</h1>
        <p className="text-gray-600">View inspection history and results</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Total Inspections</h3>
              <p className="text-2xl font-bold text-primary-600">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Passed</h3>
              <p className="text-2xl font-bold text-success-600">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-8 w-8 text-error-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Failed</h3>
              <p className="text-2xl font-bold text-error-600">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="form-group">
            <label htmlFor="date" className="label">Date</label>
            <input
              type="date"
              id="date"
              className="input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="station" className="label">Station</label>
            <select id="station" className="input">
              <option value="">All Stations</option>
              <option value="1">Line 1 - Station 1</option>
              <option value="2">Line 1 - Station 2</option>
              <option value="3">Line 1 - Station 3</option>
              <option value="4">Line 1 - Station 4</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="result" className="label">Result</label>
            <select id="result" className="input">
              <option value="">All Results</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="search" className="label">Search</label>
            <input
              type="text"
              id="search"
              className="input"
              placeholder="Search by barcode..."
            />
          </div>
        </div>
      </div>

      {/* Inspection List */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Inspections</h3>
        <div className="text-center py-8">
          <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inspections</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start scanning panels to see inspection results here.
          </p>
        </div>
      </div>
    </div>
  )
}
