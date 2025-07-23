const chalk = require('chalk');
const boxen = require('boxen');
const figlet = require('figlet');

class UIReporter {
  constructor() {
    this.icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      rocket: '🚀',
      gear: '⚙️',
      package: '📦',
      security: '🔒',
      git: '📝',
      deploy: '🌐',
      ai: '🤖',
      folder: '📁',
      file: '📄',
      link: '🔗',
      time: '⏱️',
      star: '⭐'
    };
  }

  /**
   * Display success report after project generation
   * @param {object} config - Project configuration
   * @param {string} projectPath - Project directory path
   * @param {object} options - Generation options
   */
  displaySuccessReport(config, projectPath, options = {}) {
    const projectName = config.projectName;
    const relativeProjectPath = projectPath.split(/[\\/]/).pop();
    
    console.log('\n' + '='.repeat(60));
    
    // Success header
    console.log(chalk.green.bold(`\n${this.icons.success} Project Generated Successfully!`));
    
    // Project info box
    const projectInfo = [
      `${this.icons.folder} Project: ${chalk.cyan(projectName)}`,
      `${this.icons.gear} Type: ${chalk.yellow(config.projectType.toUpperCase())}`,
      `${this.icons.package} Database: ${chalk.magenta(config.database)}`,
      `${this.icons.security} Auth: ${config.authentication ? chalk.green('Enabled') : chalk.gray('Disabled')}`,
      `${this.icons.file} TypeScript: ${config.typescript ? chalk.green('Enabled') : chalk.gray('Disabled')}`
    ].join('\n');

    console.log(boxen(projectInfo, {
      title: `${this.icons.rocket} Project Details`,
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }));

    // Next steps
    this.displayNextSteps(relativeProjectPath, config, options);
    
    // Additional information
    this.displayAdditionalInfo(config);
    
    // Footer
    console.log('\n' + chalk.green('Happy coding! ') + chalk.cyan('🎉'));
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Display next steps for the user
   * @param {string} projectPath - Project directory name
   * @param {object} config - Project configuration
   * @param {object} options - Generation options
   */
  displayNextSteps(projectPath, config, options) {
    const steps = [];
    
    // Navigate to project
    steps.push(`${chalk.yellow('cd')} ${projectPath}`);
    
    // Install dependencies if skipped
    if (options.skipInstall) {
      if (config.projectType === 'mern' || config.projectType === 'fullstack') {
        steps.push(`${chalk.yellow('cd server && npm install')}`);
        steps.push(`${chalk.yellow('cd ../client && npm install')}`);
      } else {
        steps.push(`${chalk.yellow('npm install')}`);
      }
    }
    
    // Environment setup
    steps.push(`${chalk.yellow('cp server/.env.example server/.env')} ${chalk.gray('# Configure environment variables')}`);
    
    // Start development servers
    if (config.projectType === 'mern' || config.projectType === 'fullstack') {
      steps.push(`${chalk.yellow('npm run dev')} ${chalk.gray('# Start both frontend and backend')}`);
    } else if (config.projectType === 'react' || config.projectType === 'nextjs' || config.projectType === 'vue') {
      steps.push(`${chalk.yellow('npm run dev')} ${chalk.gray('# Start development server')}`);
    } else if (config.projectType === 'express') {
      steps.push(`${chalk.yellow('npm run dev')} ${chalk.gray('# Start backend server')}`);
    }

    const nextStepsContent = steps.map(step => `  ${step}`).join('\n');
    
    console.log(boxen(nextStepsContent, {
      title: `${this.icons.rocket} Next Steps`,
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    }));
  }

  /**
   * Display additional information and tips
   * @param {object} config - Project configuration
   */
  displayAdditionalInfo(config) {
    const tips = [];
    
    // Database setup tip
    if (config.database === 'mongodb') {
      tips.push(`${this.icons.info} Make sure MongoDB is running locally or update MONGODB_URI in .env`);
    }
    
    // Authentication tip
    if (config.authentication) {
      tips.push(`${this.icons.security} Update JWT secrets in server/.env for security`);
      tips.push(`${this.icons.info} Configure email settings for password reset functionality`);
    }
    
    // Cloudinary tip
    if (config.features.includes('file-upload')) {
      tips.push(`${this.icons.info} Configure Cloudinary credentials for image uploads`);
    }
    
    // Deployment tip
    if (config.deployment) {
      tips.push(`${this.icons.deploy} Deployment configuration added for ${config.deployment.platform}`);
    }

    if (tips.length > 0) {
      console.log(chalk.blue('\n💡 Tips & Reminders:'));
      tips.forEach(tip => console.log(`  ${tip}`));
    }
  }

  /**
   * Display error help and troubleshooting
   * @param {Error} error - Error object
   */
  displayErrorHelp(error) {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.red.bold(`\n${this.icons.error} Generation Failed`));
    
    // Error details
    const errorBox = boxen(chalk.red(error.message), {
      title: 'Error Details',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red'
    });
    
    console.log(errorBox);
    
    // Troubleshooting steps
    this.displayTroubleshootingSteps(error);
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Display troubleshooting steps based on error type
   * @param {Error} error - Error object
   */
  displayTroubleshootingSteps(error) {
    const troubleshootingSteps = [];
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
      troubleshootingSteps.push('Check your internet connection');
      troubleshootingSteps.push('Verify the backend server is running');
      troubleshootingSteps.push('Check if firewall is blocking the connection');
    }
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      troubleshootingSteps.push('Generate a new configuration link from the web interface');
      troubleshootingSteps.push('Ensure the link was copied completely');
      troubleshootingSteps.push('Check if the link has expired');
    }
    
    if (error.message.includes('permission') || error.message.includes('EACCES')) {
      troubleshootingSteps.push('Check directory permissions');
      troubleshootingSteps.push('Try running with elevated permissions');
      troubleshootingSteps.push('Ensure the target directory is writable');
    }
    
    if (error.message.includes('decrypt')) {
      troubleshootingSteps.push('Verify the encryption secret is configured correctly');
      troubleshootingSteps.push('Generate a new configuration link');
      troubleshootingSteps.push('Contact support if the issue persists');
    }
    
    // Generic troubleshooting steps
    if (troubleshootingSteps.length === 0) {
      troubleshootingSteps.push('Try running the command again');
      troubleshootingSteps.push('Check the CLI documentation for similar issues');
      troubleshootingSteps.push('Enable debug mode with --debug for more information');
      troubleshootingSteps.push('Report the issue on GitHub if it persists');
    }
    
    const troubleshootingContent = troubleshootingSteps
      .map((step, index) => `  ${index + 1}. ${step}`)
      .join('\n');
    
    console.log(boxen(troubleshootingContent, {
      title: `${this.icons.gear} Troubleshooting Steps`,
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow'
    }));
    
    // Support information
    console.log(chalk.blue(`\n${this.icons.info} Need Help?`));
    console.log(`  ${this.icons.link} Documentation: https://github.com/chandanjainhp/dev-stack-composer/wiki`);
    console.log(`  ${this.icons.link} Issues: https://github.com/chandanjainhp/dev-stack-composer/issues`);
    console.log(`  ${this.icons.link} Discord: https://discord.gg/devstackcomposer`);
  }

  /**
   * Display progress information during generation
   * @param {string} step - Current step name
   * @param {string} message - Progress message
   * @param {object} options - Display options
   */
  displayProgress(step, message, options = {}) {
    const icon = options.icon || this.icons.gear;
    const color = options.color || 'blue';
    const prefix = options.prefix || '🔄';
    
    if (process.env.VERBOSE) {
      console.log(chalk[color](`${prefix} ${step}: ${message}`));
    }
  }

  /**
   * Display feature summary
   * @param {object} config - Project configuration
   */
  displayFeatureSummary(config) {
    if (!process.env.VERBOSE) return;
    
    console.log(chalk.blue(`\n${this.icons.star} Enabled Features:`));
    
    const features = [
      { name: 'TypeScript', enabled: config.typescript },
      { name: 'Authentication', enabled: config.authentication },
      { name: 'Database', enabled: config.database !== 'none' },
      { name: 'UI Library', enabled: config.uiLibrary !== 'none' },
      { name: 'State Management', enabled: config.stateManagement !== 'none' },
      { name: 'Testing', enabled: config.testing },
      { name: 'Docker', enabled: config.docker },
      { name: 'Linting', enabled: config.linting }
    ];
    
    features.forEach(feature => {
      const status = feature.enabled ? chalk.green('✅') : chalk.gray('❌');
      console.log(`  ${status} ${feature.name}`);
    });
  }

  /**
   * Display ASCII art logo
   * @param {string} text - Text to display
   */
  displayLogo(text = 'MERN-AI') {
    try {
      const logo = figlet.textSync(text, {
        font: 'Small',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      });
      console.log(chalk.cyan(logo));
    } catch (error) {
      // Fallback if figlet fails
      console.log(chalk.cyan.bold(`\n🚀 ${text}\n`));
    }
  }

  /**
   * Display completion time
   * @param {number} startTime - Start timestamp
   */
  displayCompletionTime(startTime) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(chalk.gray(`\n${this.icons.time} Completed in ${duration}s`));
  }

  /**
   * Simple logging methods for CLI usage
   */
  error(message) {
    console.log(chalk.red(`${this.icons.error} ${message}`));
  }

  success(message) {
    console.log(chalk.green(`${this.icons.success} ${message}`));
  }

  info(message) {
    console.log(chalk.blue(`${this.icons.info} ${message}`));
  }

  warn(message) {
    console.log(chalk.yellow(`${this.icons.warning} ${message}`));
  }

  /**
   * Start a spinner for long-running operations
   */
  startSpinner(message) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let index = 0;
    let interval;
    
    const start = () => {
      interval = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(frames[index])} ${message}`);
        index = (index + 1) % frames.length;
      }, 100);
    };
    
    const succeed = (finalMessage) => {
      if (interval) {
        clearInterval(interval);
        process.stdout.write(`\r${chalk.green(this.icons.success)} ${finalMessage || message}\n`);
      }
    };
    
    const fail = (finalMessage) => {
      if (interval) {
        clearInterval(interval);
        process.stdout.write(`\r${chalk.red(this.icons.error)} ${finalMessage || message}\n`);
      }
    };

    start();
    return { succeed, fail };
  }
}

module.exports = UIReporter;
