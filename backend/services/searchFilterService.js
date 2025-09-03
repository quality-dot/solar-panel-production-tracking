// Search and Filter Service
// Provides advanced search and filtering capabilities for historical data
// Task 10.4.6 - Create Search and Filter Functionality for Historical Data

import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';
import historicalDataService from './historicalDataService.js';
import fbPanelReportingService from './fbPanelReportingService.js';
import productionMetricsService from './productionMetricsService.js';

class SearchFilterService {
  constructor() {
    this.logger = manufacturingLogger;
    this.searchIndexes = new Map();
    this.filterCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.queryParams = [];
    this.paramIndex = 1;
  }

  /**
   * Advanced search across multiple data types
   * @param {Object} searchCriteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  async performAdvancedSearch(searchCriteria, options = {}) {
    try {
      const {
        query,
        dataTypes = ['manufacturing_orders', 'panels', 'inspections'],
        searchFields = [],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' }
      } = searchCriteria;

      const {
        includeHighlights = true,
        includeFacets = true,
        includeSuggestions = true,
        useFuzzySearch = false,
        searchMode = 'all' // 'all', 'any', 'phrase'
      } = options;

      // Validate search query
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters long');
      }

      const searchResults = {
        query,
        dataTypes,
        totalResults: 0,
        results: {},
        facets: {},
        suggestions: [],
        highlights: {},
        searchTime: 0,
        searchedAt: new Date().toISOString()
      };

      const startTime = Date.now();

      // Search across each data type
      for (const dataType of dataTypes) {
        const typeResults = await this.searchDataType(dataType, {
          query,
          searchFields,
          dateRange,
          filters,
          pagination,
          sorting,
          includeHighlights,
          useFuzzySearch,
          searchMode
        });

        searchResults.results[dataType] = typeResults;
        searchResults.totalResults += typeResults.total;
      }

      // Generate facets if requested
      if (includeFacets) {
        searchResults.facets = await this.generateSearchFacets(searchCriteria);
      }

      // Generate suggestions if requested
      if (includeSuggestions) {
        searchResults.suggestions = await this.generateSearchSuggestions(query);
      }

      searchResults.searchTime = Date.now() - startTime;

      this.logger.info('Advanced search completed', {
        query,
        dataTypes,
        totalResults: searchResults.totalResults,
        searchTime: searchResults.searchTime
      });

      return searchResults;

    } catch (error) {
      this.logger.error('Failed to perform advanced search', {
        error: error.message,
        searchCriteria,
        options
      });
      throw error;
    }
  }

  /**
   * Search specific data type
   * @param {string} dataType - Type of data to search
   * @param {Object} searchOptions - Search options
   * @returns {Object} Search results for the data type
   */
  async searchDataType(dataType, searchOptions) {
    try {
      const {
        query,
        searchFields = [],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' },
        includeHighlights = true,
        useFuzzySearch = false,
        searchMode = 'all'
      } = searchOptions;

      switch (dataType) {
        case 'manufacturing_orders':
          return await this.searchManufacturingOrders(query, {
            searchFields,
            dateRange,
            filters,
            pagination,
            sorting,
            includeHighlights,
            useFuzzySearch,
            searchMode
          });

        case 'panels':
          return await this.searchPanels(query, {
            searchFields,
            dateRange,
            filters,
            pagination,
            sorting,
            includeHighlights,
            useFuzzySearch,
            searchMode
          });

        case 'inspections':
          return await this.searchInspections(query, {
            searchFields,
            dateRange,
            filters,
            pagination,
            sorting,
            includeHighlights,
            useFuzzySearch,
            searchMode
          });

        case 'pallets':
          return await this.searchPallets(query, {
            searchFields,
            dateRange,
            filters,
            pagination,
            sorting,
            includeHighlights,
            useFuzzySearch,
            searchMode
          });

        case 'alerts':
          return await this.searchAlerts(query, {
            searchFields,
            dateRange,
            filters,
            pagination,
            sorting,
            includeHighlights,
            useFuzzySearch,
            searchMode
          });

        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

    } catch (error) {
      this.logger.error(`Failed to search data type ${dataType}`, {
        error: error.message,
        dataType,
        searchOptions
      });
      throw error;
    }
  }

  /**
   * Search manufacturing orders with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchManufacturingOrders(query, options = {}) {
    try {
      const {
        searchFields = ['order_number', 'customer_name', 'customer_po', 'notes'],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' },
        includeHighlights = true,
        useFuzzySearch = false,
        searchMode = 'all'
      } = options;

      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build search conditions
      const searchConditions = this.buildSearchConditions(query, searchFields, useFuzzySearch, searchMode);
      const filterConditions = this.buildFilterConditions(filters);
      const dateConditions = this.buildDateConditions(dateRange);

      // Combine all conditions
      const allConditions = [searchConditions, filterConditions, dateConditions].filter(Boolean);
      const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

      // Build relevance scoring for sorting
      const relevanceScore = this.buildRelevanceScore(query, searchFields);

      // Main search query
      const searchQuery = `
        SELECT 
          mo.*,
          u.username as created_by_username,
          ${relevanceScore} as relevance_score,
          ${includeHighlights ? this.buildHighlightFields(query, searchFields) : 'NULL as highlights'}
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        ${whereClause}
        ORDER BY ${sorting.sortBy === 'relevance' ? 'relevance_score' : `mo.${sorting.sortBy}`} ${sorting.sortOrder}
        LIMIT $${this.getNextParamIndex()} OFFSET $${this.getNextParamIndex()}
      `;

      const queryParams = this.getQueryParams();
      queryParams.push(limit, offset);

      const result = await db.query(searchQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, this.getQueryParams());
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dataType: 'manufacturing_orders',
        searchQuery: query,
        searchFields,
        highlights: includeHighlights ? this.extractHighlights(result.rows, query) : null
      };

    } catch (error) {
      this.logger.error('Failed to search manufacturing orders', {
        error: error.message,
        query,
        options
      });
      throw error;
    }
  }

  /**
   * Search panels with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchPanels(query, options = {}) {
    try {
      const {
        searchFields = ['barcode', 'serial_number', 'quality_notes', 'current_station_name'],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' },
        includeHighlights = true,
        useFuzzySearch = false,
        searchMode = 'all'
      } = options;

      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build search conditions
      const searchConditions = this.buildSearchConditions(query, searchFields, useFuzzySearch, searchMode);
      const filterConditions = this.buildFilterConditions(filters);
      const dateConditions = this.buildDateConditions(dateRange);

      // Combine all conditions
      const allConditions = [searchConditions, filterConditions, dateConditions].filter(Boolean);
      const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

      // Build relevance scoring
      const relevanceScore = this.buildRelevanceScore(query, searchFields);

      // Main search query
      const searchQuery = `
        SELECT 
          p.*,
          mo.order_number,
          mo.customer_name,
          mo.customer_po,
          s.name as current_station_name,
          ${relevanceScore} as relevance_score,
          ${includeHighlights ? this.buildHighlightFields(query, searchFields) : 'NULL as highlights'}
        FROM panels p
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON p.current_station = s.id
        ${whereClause}
        ORDER BY ${sorting.sortBy === 'relevance' ? 'relevance_score' : `p.${sorting.sortBy}`} ${sorting.sortOrder}
        LIMIT $${this.getNextParamIndex()} OFFSET $${this.getNextParamIndex()}
      `;

      const queryParams = this.getQueryParams();
      queryParams.push(limit, offset);

      const result = await db.query(searchQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM panels p
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON p.current_station = s.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, this.getQueryParams());
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dataType: 'panels',
        searchQuery: query,
        searchFields,
        highlights: includeHighlights ? this.extractHighlights(result.rows, query) : null
      };

    } catch (error) {
      this.logger.error('Failed to search panels', {
        error: error.message,
        query,
        options
      });
      throw error;
    }
  }

  /**
   * Search inspections with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchInspections(query, options = {}) {
    try {
      const {
        searchFields = ['inspection_notes', 'quality_notes', 'inspector_name'],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' },
        includeHighlights = true,
        useFuzzySearch = false,
        searchMode = 'all'
      } = options;

      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build search conditions
      const searchConditions = this.buildSearchConditions(query, searchFields, useFuzzySearch, searchMode);
      const filterConditions = this.buildFilterConditions(filters);
      const dateConditions = this.buildDateConditions(dateRange);

      // Combine all conditions
      const allConditions = [searchConditions, filterConditions, dateConditions].filter(Boolean);
      const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

      // Build relevance scoring
      const relevanceScore = this.buildRelevanceScore(query, searchFields);

      // Main search query
      const searchQuery = `
        SELECT 
          i.*,
          p.barcode,
          p.serial_number,
          mo.order_number,
          mo.customer_name,
          s.name as station_name,
          u.username as inspector_username,
          ${relevanceScore} as relevance_score,
          ${includeHighlights ? this.buildHighlightFields(query, searchFields) : 'NULL as highlights'}
        FROM inspections i
        LEFT JOIN panels p ON i.panel_id = p.id
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON i.station_id = s.id
        LEFT JOIN users u ON i.inspector_id = u.id
        ${whereClause}
        ORDER BY ${sorting.sortBy === 'relevance' ? 'relevance_score' : `i.${sorting.sortBy}`} ${sorting.sortOrder}
        LIMIT $${this.getNextParamIndex()} OFFSET $${this.getNextParamIndex()}
      `;

      const queryParams = this.getQueryParams();
      queryParams.push(limit, offset);

      const result = await db.query(searchQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM inspections i
        LEFT JOIN panels p ON i.panel_id = p.id
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON i.station_id = s.id
        LEFT JOIN users u ON i.inspector_id = u.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, this.getQueryParams());
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dataType: 'inspections',
        searchQuery: query,
        searchFields,
        highlights: includeHighlights ? this.extractHighlights(result.rows, query) : null
      };

    } catch (error) {
      this.logger.error('Failed to search inspections', {
        error: error.message,
        query,
        options
      });
      throw error;
    }
  }

  /**
   * Search pallets with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchPallets(query, options = {}) {
    try {
      const {
        searchFields = ['pallet_number', 'notes'],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' },
        includeHighlights = true,
        useFuzzySearch = false,
        searchMode = 'all'
      } = options;

      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build search conditions
      const searchConditions = this.buildSearchConditions(query, searchFields, useFuzzySearch, searchMode);
      const filterConditions = this.buildFilterConditions(filters);
      const dateConditions = this.buildDateConditions(dateRange);

      // Combine all conditions
      const allConditions = [searchConditions, filterConditions, dateConditions].filter(Boolean);
      const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

      // Build relevance scoring
      const relevanceScore = this.buildRelevanceScore(query, searchFields);

      // Main search query
      const searchQuery = `
        SELECT 
          pal.*,
          mo.order_number,
          mo.customer_name,
          mo.customer_po,
          ${relevanceScore} as relevance_score,
          ${includeHighlights ? this.buildHighlightFields(query, searchFields) : 'NULL as highlights'}
        FROM pallets pal
        LEFT JOIN manufacturing_orders mo ON pal.mo_id = mo.id
        ${whereClause}
        ORDER BY ${sorting.sortBy === 'relevance' ? 'relevance_score' : `pal.${sorting.sortBy}`} ${sorting.sortOrder}
        LIMIT $${this.getNextParamIndex()} OFFSET $${this.getNextParamIndex()}
      `;

      const queryParams = this.getQueryParams();
      queryParams.push(limit, offset);

      const result = await db.query(searchQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM pallets pal
        LEFT JOIN manufacturing_orders mo ON pal.mo_id = mo.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, this.getQueryParams());
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dataType: 'pallets',
        searchQuery: query,
        searchFields,
        highlights: includeHighlights ? this.extractHighlights(result.rows, query) : null
      };

    } catch (error) {
      this.logger.error('Failed to search pallets', {
        error: error.message,
        query,
        options
      });
      throw error;
    }
  }

  /**
   * Search alerts with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchAlerts(query, options = {}) {
    try {
      const {
        searchFields = ['title', 'message', 'alert_type'],
        dateRange = {},
        filters = {},
        pagination = { page: 1, limit: 50 },
        sorting = { sortBy: 'relevance', sortOrder: 'DESC' },
        includeHighlights = true,
        useFuzzySearch = false,
        searchMode = 'all'
      } = options;

      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build search conditions
      const searchConditions = this.buildSearchConditions(query, searchFields, useFuzzySearch, searchMode);
      const filterConditions = this.buildFilterConditions(filters);
      const dateConditions = this.buildDateConditions(dateRange);

      // Combine all conditions
      const allConditions = [searchConditions, filterConditions, dateConditions].filter(Boolean);
      const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

      // Build relevance scoring
      const relevanceScore = this.buildRelevanceScore(query, searchFields);

      // Main search query
      const searchQuery = `
        SELECT 
          ma.*,
          mo.order_number,
          mo.customer_name,
          s.name as station_name,
          ${relevanceScore} as relevance_score,
          ${includeHighlights ? this.buildHighlightFields(query, searchFields) : 'NULL as highlights'}
        FROM mo_alerts ma
        LEFT JOIN manufacturing_orders mo ON ma.mo_id = mo.id
        LEFT JOIN stations s ON ma.station_id = s.id
        ${whereClause}
        ORDER BY ${sorting.sortBy === 'relevance' ? 'relevance_score' : `ma.${sorting.sortBy}`} ${sorting.sortOrder}
        LIMIT $${this.getNextParamIndex()} OFFSET $${this.getNextParamIndex()}
      `;

      const queryParams = this.getQueryParams();
      queryParams.push(limit, offset);

      const result = await db.query(searchQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM mo_alerts ma
        LEFT JOIN manufacturing_orders mo ON ma.mo_id = mo.id
        LEFT JOIN stations s ON ma.station_id = s.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, this.getQueryParams());
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dataType: 'alerts',
        searchQuery: query,
        searchFields,
        highlights: includeHighlights ? this.extractHighlights(result.rows, query) : null
      };

    } catch (error) {
      this.logger.error('Failed to search alerts', {
        error: error.message,
        query,
        options
      });
      throw error;
    }
  }

  /**
   * Build search conditions for SQL query
   * @param {string} query - Search query
   * @param {Array} searchFields - Fields to search in
   * @param {boolean} useFuzzySearch - Whether to use fuzzy search
   * @param {string} searchMode - Search mode ('all', 'any', 'phrase')
   * @returns {string} SQL WHERE condition
   */
  buildSearchConditions(query, searchFields, useFuzzySearch, searchMode) {
    if (!query || !searchFields.length) return '';

    const searchTerms = this.parseSearchQuery(query, searchMode);
    const conditions = [];

    searchTerms.forEach(term => {
      const fieldConditions = searchFields.map(field => {
        if (useFuzzySearch) {
          return `${field} ILIKE $${this.getNextParamIndex()}`;
        } else {
          return `${field} ILIKE $${this.getNextParamIndex()}`;
        }
      });

      if (searchMode === 'all') {
        conditions.push(`(${fieldConditions.join(' OR ')})`);
      } else {
        conditions.push(`(${fieldConditions.join(' OR ')})`);
      }

      // Add search term to query params
      const searchPattern = useFuzzySearch ? `%${term}%` : `%${term}%`;
      this.addQueryParam(searchPattern);
    });

    return searchMode === 'all' ? conditions.join(' AND ') : conditions.join(' OR ');
  }

  /**
   * Build filter conditions for SQL query
   * @param {Object} filters - Filter criteria
   * @returns {string} SQL WHERE condition
   */
  buildFilterConditions(filters) {
    const conditions = [];

    Object.entries(filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          conditions.push(`${field} = ANY($${this.getNextParamIndex()})`);
          this.addQueryParam(value);
        } else if (typeof value === 'object' && value.min !== undefined) {
          if (value.min !== undefined) {
            conditions.push(`${field} >= $${this.getNextParamIndex()}`);
            this.addQueryParam(value.min);
          }
          if (value.max !== undefined) {
            conditions.push(`${field} <= $${this.getNextParamIndex()}`);
            this.addQueryParam(value.max);
          }
        } else {
          conditions.push(`${field} = $${this.getNextParamIndex()}`);
          this.addQueryParam(value);
        }
      }
    });

    return conditions.join(' AND ');
  }

  /**
   * Build date range conditions for SQL query
   * @param {Object} dateRange - Date range criteria
   * @returns {string} SQL WHERE condition
   */
  buildDateConditions(dateRange) {
    const conditions = [];

    if (dateRange.from) {
      conditions.push(`created_at >= $${this.getNextParamIndex()}`);
      this.addQueryParam(dateRange.from);
    }

    if (dateRange.to) {
      conditions.push(`created_at <= $${this.getNextParamIndex()}`);
      this.addQueryParam(dateRange.to);
    }

    return conditions.join(' AND ');
  }

  /**
   * Build relevance scoring for search results
   * @param {string} query - Search query
   * @param {Array} searchFields - Fields to search in
   * @returns {string} SQL relevance score expression
   */
  buildRelevanceScore(query, searchFields) {
    const searchTerms = this.parseSearchQuery(query, 'all');
    const scoreParts = [];

    searchTerms.forEach(term => {
      searchFields.forEach(field => {
        scoreParts.push(`CASE WHEN ${field} ILIKE '%${term}%' THEN 1 ELSE 0 END`);
      });
    });

    return `(${scoreParts.join(' + ')})`;
  }

  /**
   * Build highlight fields for search results
   * @param {string} query - Search query
   * @param {Array} searchFields - Fields to search in
   * @returns {string} SQL highlight expression
   */
  buildHighlightFields(query, searchFields) {
    const searchTerms = this.parseSearchQuery(query, 'all');
    const highlightParts = [];

    searchFields.forEach(field => {
      const fieldHighlights = searchTerms.map(term => 
        `CASE WHEN ${field} ILIKE '%${term}%' THEN '${field}: ' || ${field} ELSE '' END`
      );
      highlightParts.push(fieldHighlights.join(' || '));
    });

    return `(${highlightParts.join(' || ')})`;
  }

  /**
   * Parse search query based on search mode
   * @param {string} query - Search query
   * @param {string} searchMode - Search mode
   * @returns {Array} Parsed search terms
   */
  parseSearchQuery(query, searchMode) {
    if (searchMode === 'phrase') {
      return [query.trim()];
    } else {
      return query.trim().split(/\s+/).filter(term => term.length > 0);
    }
  }

  /**
   * Extract highlights from search results
   * @param {Array} results - Search results
   * @param {string} query - Search query
   * @returns {Object} Highlighted results
   */
  extractHighlights(results, query) {
    const highlights = {};
    const searchTerms = this.parseSearchQuery(query, 'all');

    results.forEach((result, index) => {
      highlights[index] = {};
      
      Object.entries(result).forEach(([field, value]) => {
        if (typeof value === 'string') {
          let highlightedValue = value;
          searchTerms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedValue = highlightedValue.replace(regex, '<mark>$1</mark>');
          });
          highlights[index][field] = highlightedValue;
        }
      });
    });

    return highlights;
  }

  /**
   * Generate search facets for filtering
   * @param {Object} searchCriteria - Search criteria
   * @returns {Object} Search facets
   */
  async generateSearchFacets(searchCriteria) {
    try {
      const facets = {};

      // Generate facets for each data type
      const dataTypes = searchCriteria.dataTypes || ['manufacturing_orders', 'panels'];
      
      for (const dataType of dataTypes) {
        facets[dataType] = await this.generateDataTypeFacets(dataType, searchCriteria);
      }

      return facets;

    } catch (error) {
      this.logger.error('Failed to generate search facets', {
        error: error.message,
        searchCriteria
      });
      throw error;
    }
  }

  /**
   * Generate facets for specific data type
   * @param {string} dataType - Data type
   * @param {Object} searchCriteria - Search criteria
   * @returns {Object} Data type facets
   */
  async generateDataTypeFacets(dataType, searchCriteria) {
    try {
      const facets = {};

      switch (dataType) {
        case 'manufacturing_orders':
          facets.status = await this.getFacetValues('manufacturing_orders', 'status');
          facets.panel_type = await this.getFacetValues('manufacturing_orders', 'panel_type');
          facets.priority = await this.getFacetValues('manufacturing_orders', 'priority');
          break;

        case 'panels':
          facets.status = await this.getFacetValues('panels', 'status');
          facets.panel_type = await this.getFacetValues('panels', 'panel_type');
          facets.frame_type = await this.getFacetValues('panels', 'frame_type');
          facets.backsheet_type = await this.getFacetValues('panels', 'backsheet_type');
          break;

        case 'inspections':
          facets.inspection_type = await this.getFacetValues('inspections', 'inspection_type');
          facets.result = await this.getFacetValues('inspections', 'result');
          break;

        case 'pallets':
          facets.status = await this.getFacetValues('pallets', 'status');
          break;

        case 'alerts':
          facets.alert_type = await this.getFacetValues('mo_alerts', 'alert_type');
          facets.severity = await this.getFacetValues('mo_alerts', 'severity');
          facets.status = await this.getFacetValues('mo_alerts', 'status');
          break;
      }

      return facets;

    } catch (error) {
      this.logger.error(`Failed to generate facets for ${dataType}`, {
        error: error.message,
        dataType,
        searchCriteria
      });
      throw error;
    }
  }

  /**
   * Get facet values for a field
   * @param {string} table - Table name
   * @param {string} field - Field name
   * @returns {Array} Facet values with counts
   */
  async getFacetValues(table, field) {
    try {
      const query = `
        SELECT ${field} as value, COUNT(*) as count
        FROM ${table}
        WHERE ${field} IS NOT NULL
        GROUP BY ${field}
        ORDER BY count DESC, ${field}
      `;

      const result = await db.query(query);
      return result.rows;

    } catch (error) {
      this.logger.error(`Failed to get facet values for ${table}.${field}`, {
        error: error.message,
        table,
        field
      });
      throw error;
    }
  }

  /**
   * Generate search suggestions
   * @param {string} query - Search query
   * @returns {Array} Search suggestions
   */
  async generateSearchSuggestions(query) {
    try {
      const suggestions = [];
      const searchTerms = query.trim().split(/\s+/);
      const lastTerm = searchTerms[searchTerms.length - 1];

      if (lastTerm.length < 2) return suggestions;

      // Get suggestions from different tables
      const suggestionQueries = [
        {
          table: 'manufacturing_orders',
          fields: ['order_number', 'customer_name'],
          limit: 5
        },
        {
          table: 'panels',
          fields: ['barcode', 'serial_number'],
          limit: 5
        },
        {
          table: 'mo_alerts',
          fields: ['title', 'alert_type'],
          limit: 3
        }
      ];

      for (const suggestionQuery of suggestionQueries) {
        for (const field of suggestionQuery.fields) {
          const query = `
            SELECT DISTINCT ${field} as suggestion
            FROM ${suggestionQuery.table}
            WHERE ${field} ILIKE $1
            ORDER BY ${field}
            LIMIT $2
          `;

          const result = await db.query(query, [`%${lastTerm}%`, suggestionQuery.limit]);
          suggestions.push(...result.rows.map(row => row.suggestion));
        }
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);

      return uniqueSuggestions;

    } catch (error) {
      this.logger.error('Failed to generate search suggestions', {
        error: error.message,
        query
      });
      throw error;
    }
  }

  /**
   * Get saved searches for user
   * @param {string} userId - User ID
   * @returns {Array} Saved searches
   */
  async getSavedSearches(userId) {
    try {
      // This would typically be stored in a database table
      // For now, return empty array as placeholder
      return [];

    } catch (error) {
      this.logger.error('Failed to get saved searches', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Save search for user
   * @param {string} userId - User ID
   * @param {Object} searchCriteria - Search criteria
   * @param {string} name - Search name
   * @returns {Object} Save result
   */
  async saveSearch(userId, searchCriteria, name) {
    try {
      // This would typically be stored in a database table
      // For now, return success as placeholder
      return {
        success: true,
        message: 'Search saved successfully',
        searchId: 'placeholder-id'
      };

    } catch (error) {
      this.logger.error('Failed to save search', {
        error: error.message,
        userId,
        searchCriteria,
        name
      });
      throw error;
    }
  }

  /**
   * Get search analytics
   * @param {Object} filters - Filter criteria
   * @returns {Object} Search analytics
   */
  async getSearchAnalytics(filters = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        dataType
      } = filters;

      // This would typically query a search log table
      // For now, return placeholder analytics
      return {
        totalSearches: 0,
        popularQueries: [],
        searchTrends: [],
        dataTypeDistribution: {},
        dateRange: { dateFrom, dateTo }
      };

    } catch (error) {
      this.logger.error('Failed to get search analytics', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  // Helper methods for query building

  getNextParamIndex() {
    return this.paramIndex++;
  }

  addQueryParam(value) {
    this.queryParams.push(value);
  }

  getQueryParams() {
    return this.queryParams;
  }

  resetQueryParams() {
    this.queryParams = [];
    this.paramIndex = 1;
  }
}

export default new SearchFilterService();
