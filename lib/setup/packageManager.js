const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Package Manager utility for handling dependency installation
 * Supports npm, yarn, pnpm, and bun
 */
class PackageManager {
  constructor(reporter) {
    this.reporter = reporter;
    this.availableManagers = ['npm', 'yarn', 'pnpm', 'bun'];
  }

  /**
   * Detect which package managers are available
   */
  detectAvailableManagers() {
    const available = [];
    
    for (const manager of this.availableManagers) {
      try {
        execSync(`${manager} --version`, { stdio: 'ignore' });
        available.push(manager);
      } catch (error) {
        // Manager not available
      }
    }
    
    return available;
  }

  /**
   * Determine the best package manager to use
   */
  determineBestManager(projectPath) {
    const available = this.detectAvailableManagers();
    
    if (available.length === 0) {
      throw new Error('No package manager found. Please install npm, yarn, pnpm, or bun.');
    }

    // Check for lock files to determine preferred manager
    const lockFiles = {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'bun.lockb': 'bun'
    };

    for (const [lockFile, manager] of Object.entries(lockFiles)) {
      if (fs.existsSync(path.join(projectPath, lockFile)) && available.includes(manager)) {
        return manager;
      }
    }

    // Default preference order
    const preferences = ['bun', 'pnpm', 'yarn', 'npm'];
    for (const manager of preferences) {
      if (available.includes(manager)) {
        return manager;
      }
    }

    return available[0];
  }

  /**
   * Get the install command for a package manager
   */
  getInstallCommand(manager, isDev = false) {
    const commands = {
      npm: isDev ? 'npm install --save-dev' : 'npm install',
      yarn: isDev ? 'yarn add --dev' : 'yarn add',
      pnpm: isDev ? 'pnpm add --save-dev' : 'pnpm add',
      bun: isDev ? 'bun add --dev' : 'bun add'
    };

    return commands[manager] || commands.npm;
  }

  /**
   * Get the run script command for a package manager
   */
  getRunCommand(manager, script) {
    const commands = {
      npm: `npm run ${script}`,
      yarn: `yarn ${script}`,
      pnpm: `pnpm ${script}`,
      bun: `bun run ${script}`
    };

    return commands[manager] || commands.npm;
  }

  /**
   * Install dependencies in a project
   */
  async installDependencies(projectPath, options = {}) {
    const { force = false, manager = null } = options;
    
    const targetManager = manager || this.determineBestManager(projectPath);
    
    this.reporter.info(`Installing dependencies using ${chalk.cyan(targetManager)}...`);
    
    const spinner = this.reporter.startSpinner(`Installing dependencies...`);
    
    try {
      const installCommands = {
        npm: 'npm install',
        yarn: 'yarn install',
        pnpm: 'pnpm install',
        bun: 'bun install'
      };

      const command = installCommands[targetManager];
      
      execSync(command, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      spinner.succeed('Dependencies installed successfully');
      
      return {
        success: true,
        manager: targetManager
      };
      
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      throw new Error(`Dependency installation failed: ${error.message}`);
    }
  }

  /**
   * Add specific packages to a project
   */
  async addPackages(projectPath, packages, options = {}) {
    const { isDev = false, manager = null } = options;
    
    if (!packages || packages.length === 0) {
      return { success: true, packages: [] };
    }

    const targetManager = manager || this.determineBestManager(projectPath);
    const command = this.getInstallCommand(targetManager, isDev);
    
    this.reporter.info(`Adding packages: ${chalk.cyan(packages.join(', '))}`);
    
    const spinner = this.reporter.startSpinner(`Installing packages...`);
    
    try {
      execSync(`${command} ${packages.join(' ')}`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      spinner.succeed(`Packages added successfully`);
      
      return {
        success: true,
        packages,
        manager: targetManager
      };
      
    } catch (error) {
      spinner.fail('Failed to add packages');
      throw new Error(`Package installation failed: ${error.message}`);
    }
  }

  /**
   * Check if dependencies are installed
   */
  isDependenciesInstalled(projectPath) {
    const nodeModules = path.join(projectPath, 'node_modules');
    return fs.existsSync(nodeModules);
  }

  /**
   * Get package manager info for a project
   */
  getProjectManagerInfo(projectPath) {
    const manager = this.determineBestManager(projectPath);
    const available = this.detectAvailableManagers();
    const installed = this.isDependenciesInstalled(projectPath);

    return {
      current: manager,
      available,
      installed,
      runCommand: (script) => this.getRunCommand(manager, script)
    };
  }
}

module.exports = PackageManager;
