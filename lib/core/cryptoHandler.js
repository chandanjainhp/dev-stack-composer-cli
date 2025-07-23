const crypto = require('crypto');
const Joi = require('joi');
const chalk = require('chalk');

class CryptoHandler {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Get encryption secret from environment or generate one
    this.secretKey = this.getSecretKey();
  }

  /**
   * Get or generate encryption secret key
   * @returns {Buffer} Secret key buffer
   */
  getSecretKey() {
    const secret = process.env.ENCRYPTION_SECRET || process.env.MERN_SECRET;
    
    if (secret) {
      // Hash the secret to ensure consistent 32-byte key
      return crypto.createHash('sha256').update(secret).digest();
    }
    
    // For development, use a default key (not secure for production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(chalk.yellow('⚠️  Using default encryption key for development'));
      return crypto.createHash('sha256').update('dev-stack-composer-default-key').digest();
    }
    
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }

  /**
   * Decrypt configuration data
   * @param {string} encryptedData - Encrypted configuration string
   * @returns {object} Decrypted configuration object
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data format');
      }

      // Handle different encryption formats
      if (this.isBase64Json(encryptedData)) {
        // Plain base64 encoded JSON (fallback for development)
        return this.decryptBase64(encryptedData);
      }
      
      // Standard AES-GCM encryption
      return this.decryptAES(encryptedData);
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(chalk.red('🔍 Decryption Error:'), error);
      }
      throw new Error(`Failed to decrypt configuration: ${error.message}`);
    }
  }

  /**
   * Decrypt AES-GCM encrypted data
   * @param {string} encryptedData - Encrypted data in format: iv:tag:encrypted
   * @returns {object} Decrypted object
   */
  decryptAES(encryptedData) {
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    // Validate buffer lengths
    if (iv.length !== this.ivLength) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== this.tagLength) {
      throw new Error('Invalid auth tag length');
    }

    const decipher = crypto.createDecipherGCM(this.algorithm, this.secretKey);
    decipher.setIV(iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Decrypt base64 encoded JSON (fallback method)
   * @param {string} base64Data - Base64 encoded JSON
   * @returns {object} Parsed object
   */
  decryptBase64(base64Data) {
    const jsonString = Buffer.from(base64Data, 'base64').toString('utf8');
    return JSON.parse(jsonString);
  }

  /**
   * Check if data is base64 encoded JSON
   * @param {string} data - Data to check
   * @returns {boolean} Is base64 JSON
   */
  isBase64Json(data) {
    try {
      // Base64 data should not contain colons (which AES format has)
      if (data.includes(':')) return false;
      
      const decoded = Buffer.from(data, 'base64').toString('utf8');
      JSON.parse(decoded);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt data (for testing or local development)
   * @param {object} data - Data to encrypt
   * @returns {string} Encrypted string
   */
  encrypt(data) {
    try {
      const jsonString = JSON.stringify(data);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipherGCM(this.algorithm, this.secretKey);
      cipher.setIV(iv);
      
      let encrypted = cipher.update(jsonString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  /**
   * Validate decrypted configuration against schema
   * @param {object} config - Configuration object to validate
   * @returns {object} Validated configuration
   */
  validateConfig(config) {
    const schema = Joi.object({
      projectName: Joi.string().min(3).max(50).required()
        .pattern(/^[a-zA-Z0-9-_]+$/)
        .message('Project name must contain only letters, numbers, hyphens, and underscores'),
      
      projectType: Joi.string()
        .valid('mern', 'react', 'express', 'nextjs', 'vue', 'nuxt', 'fullstack')
        .required(),
      
      description: Joi.string().max(500).optional(),
      
      features: Joi.array()
        .items(Joi.string().valid(
          'authentication', 'database', 'api', 'ui-library', 'state-management',
          'testing', 'deployment', 'docker', 'typescript', 'linting'
        ))
        .default([]),
      
      database: Joi.string()
        .valid('mongodb', 'postgresql', 'mysql', 'sqlite', 'none')
        .default('mongodb'),
      
      authentication: Joi.boolean().default(false),
      
      uiLibrary: Joi.string()
        .valid('none', 'tailwind', 'material-ui', 'chakra-ui', 'ant-design', 'bootstrap')
        .default('tailwind'),
      
      stateManagement: Joi.string()
        .valid('none', 'redux', 'zustand', 'context', 'recoil')
        .default('context'),
      
      deployment: Joi.object({
        platform: Joi.string()
          .valid('vercel', 'netlify', 'heroku', 'aws', 'docker', 'railway', 'render')
          .default('vercel'),
        config: Joi.object().default({})
      }).optional(),
      
      packages: Joi.array().items(Joi.string()).default([]),
      
      typescript: Joi.boolean().default(true),
      
      linting: Joi.boolean().default(true),
      
      testing: Joi.boolean().default(false),
      
      docker: Joi.boolean().default(false),
      
      // Metadata
      createdAt: Joi.date().optional(),
      expiresAt: Joi.date().optional(),
      userId: Joi.string().optional(),
      version: Joi.string().default('1.0.0')
    });

    const { error, value } = schema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    // Check expiration
    if (value.expiresAt && new Date() > new Date(value.expiresAt)) {
      throw new Error('Configuration has expired. Please generate a new link.');
    }

    // Validate project name uniqueness (basic check)
    if (value.projectName.toLowerCase() === 'node_modules') {
      throw new Error('Invalid project name: cannot be "node_modules"');
    }

    if (process.env.VERBOSE) {
      console.log(chalk.green('✅ Configuration validated successfully'));
      this.displayConfigSummary(value);
    }

    return value;
  }

  /**
   * Display configuration summary for verbose mode
   * @param {object} config - Validated configuration
   */
  displayConfigSummary(config) {
    console.log(chalk.blue('\n📋 Configuration Summary:'));
    console.log(chalk.gray('  Project Name:'), config.projectName);
    console.log(chalk.gray('  Project Type:'), config.projectType);
    console.log(chalk.gray('  Database:'), config.database);
    console.log(chalk.gray('  Authentication:'), config.authentication ? '✅' : '❌');
    console.log(chalk.gray('  TypeScript:'), config.typescript ? '✅' : '❌');
    console.log(chalk.gray('  UI Library:'), config.uiLibrary);
    console.log(chalk.gray('  Features:'), config.features.join(', ') || 'None');
    
    if (config.deployment) {
      console.log(chalk.gray('  Deployment:'), config.deployment.platform);
    }
  }

  /**
   * Generate a hash of the configuration for integrity checking
   * @param {object} config - Configuration object
   * @returns {string} SHA-256 hash
   */
  generateConfigHash(config) {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Verify configuration integrity
   * @param {object} config - Configuration object
   * @param {string} expectedHash - Expected hash value
   * @returns {boolean} Configuration is valid
   */
  verifyConfigIntegrity(config, expectedHash) {
    const actualHash = this.generateConfigHash(config);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }
}

module.exports = CryptoHandler;
