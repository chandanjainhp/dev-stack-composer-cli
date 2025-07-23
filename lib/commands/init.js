const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');

const LinkParser = require('../core/linkParser');
const ConfigFetcher = require('../core/configFetcher');
const CryptoHandler = require('../core/cryptoHandler');
const ProjectScaffolder = require('../generators/projectScaffolder');
const PackageManager = require('../setup/packageManager');
const SecurityHandler = require('../setup/securityHandler');
const GitHandler = require('../setup/gitHandler');
const UIReporter = require('../ui/reporter');

class InitCommand {
  constructor() {
    this.linkParser = new LinkParser();
    this.configFetcher = new ConfigFetcher();
    this.cryptoHandler = new CryptoHandler();
    this.scaffolder = new ProjectScaffolder();
    this.packageManager = new PackageManager();
    this.securityHandler = new SecurityHandler();
    this.gitHandler = new GitHandler();
    this.reporter = new UIReporter();
    this.startTime = Date.now();
  }

  /**
   * Execute the init command
   * @param {string} link - Configuration link
   * @param {object} options - Command options
   */
  async execute(link, options) {
    const spinner = ora();
    
    try {
      // Validate prerequisites
      await this.validatePrerequisites();
      
      // Step 1: Parse and validate link
      spinner.start(`${chalk.blue('🔗')} Parsing configuration link...`);
      const linkData = this.linkParser.parseLink(link);
      this.linkParser.validateLink(linkData);
      this.linkParser.displayLinkInfo(linkData);
      spinner.succeed(`${chalk.green('✅')} Link validated successfully`);

      // Step 2: Test server connectivity
      spinner.start(`${chalk.blue('🌐')} Testing server connectivity...`);
      const serverStatus = await this.configFetcher.checkServerStatus();
      if (!serverStatus) {
        spinner.warn(`${chalk.yellow('⚠️')} Server connectivity test failed, but continuing...`);
      } else {
        spinner.succeed(`${chalk.green('✅')} Server connectivity confirmed`);
      }

      // Step 3: Fetch configuration
      spinner.start(`${chalk.blue('📥')} Fetching project configuration...`);
      const encryptedConfig = await this.configFetcher.fetchConfig(
        linkData.configId,
        linkData.token
      );
      spinner.succeed(`${chalk.green('✅')} Configuration fetched from server`);

      // Step 4: Decrypt and validate (handle both encrypted and plain data)
      spinner.start(`${chalk.blue('🔓')} Processing configuration...`);
      let config;
      const configData = encryptedConfig.data || encryptedConfig;
      
      // Check if data is already a plain object (not encrypted)
      if (typeof configData === 'object' && configData !== null) {
        config = configData;
      } else {
        // Data is encrypted, decrypt it
        config = this.cryptoHandler.decrypt(configData);
      }
      
      // Transform backend config format to CLI expected format
      const transformedConfig = this.transformBackendConfig(config);
      const validatedConfig = this.cryptoHandler.validateConfig(transformedConfig);
      spinner.succeed(`${chalk.green('✅')} Configuration processed and validated`);

      // Display feature summary if verbose
      this.reporter.displayFeatureSummary(validatedConfig);

      // Step 5: Determine target directory
      const targetPath = await this.determineTargetPath(validatedConfig, options);
      
      // Confirm overwrite if directory exists
      if (fs.existsSync(targetPath) && !options.force) {
        const overwrite = await this.confirmOverwrite(targetPath);
        if (!overwrite) {
          console.log(chalk.yellow('Operation cancelled by user.'));
          return;
        }
      }

      // Step 6: Scaffold project structure
      spinner.start(`${chalk.blue('🏗️')} Creating project structure...`);
      await this.scaffolder.scaffoldProject(validatedConfig, targetPath);
      spinner.succeed(`${chalk.green('✅')} Project structure created`);

      // Step 7: Setup security and environment
      spinner.start(`${chalk.blue('🔒')} Setting up security configuration...`);
      await this.securityHandler.setupSecurityConfig(targetPath, validatedConfig);
      spinner.succeed(`${chalk.green('✅')} Security configuration completed`);

      // Step 8: Install dependencies
      if (!options.skipInstall) {
        spinner.start(`${chalk.blue('📦')} Installing dependencies...`);
        await this.packageManager.installDependencies(
          targetPath, 
          validatedConfig, 
          options.packageManager
        );
        spinner.succeed(`${chalk.green('✅')} Dependencies installed successfully`);
      } else {
        console.log(chalk.yellow('⏭️  Skipping dependency installation'));
      }

      // Step 9: Git initialization
      if (!options.skipGit) {
        spinner.start(`${chalk.blue('📝')} Initializing Git repository...`);
        await this.gitHandler.initializeRepository(targetPath, validatedConfig);
        spinner.succeed(`${chalk.green('✅')} Git repository initialized`);
      } else {
        console.log(chalk.yellow('⏭️  Skipping Git initialization'));
      }

      // Step 10: Generate additional configurations
      if (validatedConfig.deployment) {
        spinner.start(`${chalk.blue('🚀')} Setting up deployment configuration...`);
        await this.setupDeploymentConfig(targetPath, validatedConfig.deployment);
        spinner.succeed(`${chalk.green('✅')} Deployment configuration created`);
      }

      // Success report
      this.reporter.displayCompletionTime(this.startTime);
      this.reporter.displaySuccessReport(validatedConfig, targetPath, {
        skipInstall: options.skipInstall,
        skipGit: options.skipGit
      });

    } catch (error) {
      spinner.fail(`${chalk.red('❌')} ${error.message}`);
      
      if (process.env.DEBUG) {
        console.error(chalk.red('\n🔍 Debug Information:'));
        console.error(error.stack);
      }
      
      this.reporter.displayErrorHelp(error);
      process.exit(1);
    }
  }

  /**
   * Validate system prerequisites
   */
  async validatePrerequisites() {
    const prerequisites = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 16) {
      prerequisites.push('Node.js version 16 or higher is required');
    }
    
    // Check Git installation
    try {
      const { execSync } = require('child_process');
      execSync('git --version', { stdio: 'ignore' });
    } catch (error) {
      prerequisites.push('Git is required for repository initialization');
    }
    
    if (prerequisites.length > 0) {
      console.log(chalk.red('\n❌ Prerequisites not met:'));
      prerequisites.forEach(req => console.log(`  • ${req}`));
      console.log(chalk.yellow('\nPlease install the required dependencies and try again.\n'));
      process.exit(1);
    }
  }

  /**
   * Determine target directory path
   * @param {object} config - Project configuration
   * @param {object} options - Command options
   * @returns {string} Target directory path
   */
  async determineTargetPath(config, options) {
    if (options.directory && options.directory !== process.cwd()) {
      // User specified a directory name
      return path.resolve(process.cwd(), options.directory);
    }
    
    // Use project name from config
    const projectDir = config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return path.resolve(process.cwd(), projectDir);
  }

  /**
   * Confirm directory overwrite
   * @param {string} targetPath - Target directory path
   * @returns {boolean} User confirmed overwrite
   */
  async confirmOverwrite(targetPath) {
    const dirName = path.basename(targetPath);
    
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${dirName}" already exists. Overwrite?`,
        default: false
      }
    ]);
    
    return overwrite;
  }

  /**
   * Setup deployment configuration
   * @param {string} projectPath - Project directory path
   * @param {object} deploymentConfig - Deployment configuration
   */
  async setupDeploymentConfig(projectPath, deploymentConfig) {
    try {
      const DeploymentSetup = require('../setup/deploymentSetup');
      const deployment = new DeploymentSetup();
      
      await deployment.setupForPlatform(
        projectPath,
        deploymentConfig.platform,
        deploymentConfig.config
      );
    } catch (error) {
      if (process.env.DEBUG) {
        console.log(chalk.yellow('🔍 Deployment setup failed:'), error.message);
      }
      // Don't fail the entire process for deployment setup issues
      console.log(chalk.yellow('⚠️  Deployment configuration setup failed, but project was created successfully'));
    }
  }

  /**
   * Transform backend configuration format to CLI expected format
   * @param {object} backendConfig - Configuration from backend
   * @returns {object} Transformed configuration
   */
  transformBackendConfig(backendConfig) {
    // Map UI framework to CLI expected values
    const uiLibraryMap = {
      'react': 'none', // React without specific UI library
      'vue': 'none',
      'angular': 'none'
    };

    return {
      projectName: backendConfig.name,
      projectType: backendConfig.type || 'fullstack',
      description: backendConfig.description || `A ${backendConfig.name} project`,
      features: backendConfig.features || [],
      database: backendConfig.database || 'mongodb',
      authentication: backendConfig.options?.auth !== false,
      uiLibrary: uiLibraryMap[backendConfig.uiFramework] || 'tailwind',
      backend: backendConfig.backend || 'express',
      styling: 'tailwind',
      packageManager: 'npm',
      typescript: backendConfig.options?.typescript !== false,
      linting: backendConfig.options?.linter !== false,
      testing: backendConfig.options?.testing === true,
      docker: backendConfig.options?.dockerfile === true,
      gitInit: backendConfig.options?.gitInit !== false,
      // Include original config for reference
      _original: backendConfig
    };
  }

  /**
   * Handle cleanup on process interruption
   */
  setupCleanup() {
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n⚠️  Process interrupted by user'));
      console.log(chalk.gray('Cleaning up...'));
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n\n⚠️  Process terminated'));
      console.log(chalk.gray('Cleaning up...'));
      process.exit(0);
    });
  }
}

/**
 * Command handler function
 * @param {string} link - Configuration link
 * @param {object} options - Command options
 */
module.exports = async (link, options) => {
  const command = new InitCommand();
  
  // Setup cleanup handlers
  command.setupCleanup();
  
  // Validate link parameter
  if (!link || typeof link !== 'string') {
    console.error(chalk.red('❌ Configuration link is required'));
    console.log(chalk.yellow('💡 Usage: mern-ai init <configuration-link>'));
    process.exit(1);
  }
  
  // Execute command
  await command.execute(link, options);
};
