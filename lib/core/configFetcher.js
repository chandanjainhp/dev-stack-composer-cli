const axios = require('axios');
const chalk = require('chalk');

class ConfigFetcher {
  constructor() {
    this.baseURL = process.env.BACKEND_URL || 'http://localhost:8000';
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `mern-ai-cli/1.0.0`,
        'Accept': 'application/json'
      }
    });

    // Setup request/response interceptors
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  setupInterceptors() {
    // Request interceptor
    this.apiClient.interceptors.request.use(
      (config) => {
        if (process.env.DEBUG) {
          console.log(chalk.blue(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`));
        }
        return config;
      },
      (error) => {
        console.error(chalk.red('❌ Request Error:'), error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.apiClient.interceptors.response.use(
      (response) => {
        if (process.env.DEBUG) {
          console.log(chalk.green(`✅ API Response: ${response.status} ${response.statusText}`));
        }
        return response;
      },
      (error) => {
        this.handleResponseError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle API response errors with user-friendly messages
   * @param {Error} error - Axios error object
   */
  handleResponseError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, statusText, data } = error.response;
      
      switch (status) {
        case 404:
          error.message = 'Configuration not found. The link may be invalid or expired.';
          break;
        case 401:
          error.message = 'Authentication failed. Invalid or expired token.';
          break;
        case 403:
          error.message = 'Access denied. You may not have permission to access this configuration.';
          break;
        case 429:
          error.message = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          error.message = 'Server error. Please try again later.';
          break;
        default:
          error.message = data?.message || `Server error: ${status} ${statusText}`;
      }
    } else if (error.request) {
      // Network error
      if (error.code === 'ECONNREFUSED') {
        error.message = 'Cannot connect to the server. Please check your internet connection.';
      } else if (error.code === 'ENOTFOUND') {
        error.message = 'Server not found. Please check the server URL.';
      } else if (error.code === 'ETIMEDOUT') {
        error.message = 'Request timed out. Please try again.';
      } else {
        error.message = 'Network error. Please check your internet connection.';
      }
    }
  }

  /**
   * Fetch configuration from backend API
   * @param {string} configId - Configuration ID
   * @param {string} token - Authentication token (optional)
   * @returns {Promise<object>} Configuration data
   */
  async fetchConfig(configId, token = null) {
    try {
      const headers = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      if (process.env.VERBOSE) {
        console.log(chalk.blue('📥 Fetching configuration...'));
        console.log(chalk.gray('  Config ID:'), configId);
        console.log(chalk.gray('  Using Token:'), token ? '✅' : '❌');
      }

      const response = await this.apiClient.get(`/api/v1/projects/config/${configId}`, {
        headers
      });

      // Validate response structure
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format from server');
      }

      if (process.env.VERBOSE) {
        console.log(chalk.green('✅ Configuration fetched successfully'));
      }

      return response.data;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(chalk.red('🔍 Fetch Config Error:'), error);
      }
      throw error;
    }
  }

  /**
   * Fetch user information if authenticated
   * @param {string} token - Authentication token
   * @returns {Promise<object>} User information
   */
  async fetchUserInfo(token) {
    try {
      const response = await this.apiClient.get('/api/v1/users/user-profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      if (process.env.DEBUG) {
        console.log(chalk.yellow('🔍 Could not fetch user info:'), error.message);
      }
      return null;
    }
  }

  /**
   * Check server status and connectivity
   * @returns {Promise<boolean>} Server is accessible
   */
  async checkServerStatus() {
    try {
      const response = await this.apiClient.get('/api/v1/health', {
        timeout: 5000
      });
      
      return response.status === 200;
    } catch (error) {
      if (process.env.DEBUG) {
        console.log(chalk.yellow('🔍 Server status check failed:'), error.message);
      }
      return false;
    }
  }

  /**
   * Validate configuration data structure
   * @param {object} config - Configuration object
   * @returns {boolean} Configuration is valid
   */
  validateConfigStructure(config) {
    const requiredFields = ['projectName', 'projectType'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate project type
    const validTypes = ['mern', 'react', 'express', 'nextjs', 'vue', 'nuxt'];
    if (!validTypes.includes(config.projectType)) {
      throw new Error(`Invalid project type: ${config.projectType}`);
    }

    return true;
  }

  /**
   * Get API endpoint information
   * @returns {object} API endpoint details
   */
  getEndpointInfo() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      userAgent: 'mern-ai-cli/1.0.0'
    };
  }

  /**
   * Test API connectivity
   * @returns {Promise<object>} Connection test results
   */
  async testConnection() {
    const startTime = Date.now();
    
    try {
      const response = await this.apiClient.get('/api/v1/health', {
        timeout: 10000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        status: response.status,
        message: 'Connection successful'
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: false,
        responseTime,
        error: error.message,
        message: 'Connection failed'
      };
    }
  }
}

module.exports = ConfigFetcher;
