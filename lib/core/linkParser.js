const crypto = require('crypto');
const chalk = require('chalk');

class LinkParser {
  constructor() {
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    this.supportedDomains = [
      'devstackcomposer.com',
      'dev-stack-composer.vercel.app',
      'localhost:5173',
      'localhost:3000'
    ];
  }

  /**
   * Parse and validate shareable link
   * @param {string} link - Shareable configuration link
   * @returns {object} Parsed link data
   */
  parseLink(link) {
    try {
      const url = new URL(link);
      
      // Validate domain - check hostname:port combination for localhost
      const hostWithPort = url.port ? `${url.hostname}:${url.port}` : url.hostname;
      if (!this.supportedDomains.some(domain => 
        hostWithPort.includes(domain) || url.hostname.includes(domain)
      )) {
        throw new Error(`Unsupported domain: ${hostWithPort}`);
      }

      // Parse path for config ID
      const pathMatch = url.pathname.match(/\/(?:config|share)\/([a-zA-Z0-9-_]+)/);
      if (!pathMatch) {
        throw new Error('Invalid link format - missing configuration ID');
      }

      const configId = pathMatch[1];
      const token = url.searchParams.get('token');
      const userId = url.searchParams.get('user');
      const expires = url.searchParams.get('expires');

      // Basic validation
      if (!configId || configId.length < 6) {
        throw new Error('Invalid configuration ID');
      }

      return {
        configId,
        token,
        userId,
        expires: expires ? new Date(parseInt(expires) * 1000) : null,
        fullUrl: link,
        hostname: url.hostname
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Validate link signature and expiration
   * @param {object} linkData - Parsed link data
   * @returns {boolean} Validation result
   */
  validateLink(linkData) {
    // Check expiration
    if (linkData.expires && new Date() > linkData.expires) {
      throw new Error('Configuration link has expired');
    }

    // Validate token format if present
    if (linkData.token && !this.isValidToken(linkData.token)) {
      throw new Error('Invalid token format');
    }

    return true;
  }

  /**
   * Validate token format
   * @param {string} token - Token to validate
   * @returns {boolean} Is valid token
   */
  isValidToken(token) {
    // Token should be alphanumeric and at least 16 characters
    const tokenPattern = /^[a-zA-Z0-9]{16,}$/;
    return tokenPattern.test(token);
  }

  /**
   * Generate API endpoint URL for config fetching
   * @param {object} linkData - Parsed link data
   * @returns {string} API endpoint URL
   */
  getApiEndpoint(linkData) {
    return `${this.baseUrl}/api/v1/configs/${linkData.configId}`;
  }

  /**
   * Verify HMAC signature for tamper-proofing
   * @param {object} linkData - Parsed link data
   * @param {string} secret - Secret key for HMAC
   * @returns {boolean} Signature is valid
   */
  verifySignature(linkData, secret) {
    if (!linkData.token || !secret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${linkData.configId}:${linkData.userId || ''}`)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(linkData.token, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      if (process.env.DEBUG) {
        console.log(chalk.yellow('🔍 Signature verification failed:'), error.message);
      }
      return false;
    }
  }

  /**
   * Extract project information from link if available
   * @param {string} link - Shareable link
   * @returns {object} Basic project info
   */
  extractProjectInfo(link) {
    try {
      const url = new URL(link);
      const projectName = url.searchParams.get('name');
      const projectType = url.searchParams.get('type');
      const features = url.searchParams.get('features');

      return {
        name: projectName,
        type: projectType,
        features: features ? features.split(',') : []
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Display link information for debugging
   * @param {object} linkData - Parsed link data
   */
  displayLinkInfo(linkData) {
    if (!process.env.VERBOSE) return;

    console.log(chalk.blue('\n🔗 Link Information:'));
    console.log(chalk.gray('  Config ID:'), linkData.configId);
    console.log(chalk.gray('  Has Token:'), linkData.token ? '✅' : '❌');
    console.log(chalk.gray('  User ID:'), linkData.userId || 'N/A');
    console.log(chalk.gray('  Expires:'), linkData.expires ? linkData.expires.toISOString() : 'Never');
    console.log(chalk.gray('  Hostname:'), linkData.hostname);
  }
}

module.exports = LinkParser;
