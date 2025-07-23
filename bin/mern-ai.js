#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const package = require('../package.json');

// Import commands and utilities
const Reporter = require('../lib/ui/reporter');

// Initialize reporter
const reporter = new Reporter();

const program = new Command();

// CLI Header
console.log(
  chalk.cyan(
    figlet.textSync('MERN-AI', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })
  )
);

console.log(chalk.cyan(`\n🚀 Dev Stack Composer CLI v${package.version}`));
console.log(chalk.gray('AI-powered MERN stack project generator\n'));

// Configure CLI
program
  .name('mern-ai')
  .description('AI-powered MERN stack project generator for Dev Stack Composer')
  .version(package.version, '-v, --version', 'display version number');

// Global options
program
  .option('--debug', 'enable debug mode')
  .option('--verbose', 'enable verbose output')
  .option('--config <path>', 'specify config file path');

// Register commands
program
  .command('init <link>')
  .description('Initialize a new project from a shareable configuration link')
  .option('-d, --directory <dir>', 'Target directory name (default: project name from config)')
  .option('-f, --force', 'Overwrite existing directory')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-git', 'Skip git initialization')
  .option('--skip-ai', 'Skip AI code generation')
  .option('--package-manager <pm>', 'Package manager to use (npm, yarn, pnpm, bun)', 'npm')
  .action(async (link, options) => {
    try {
      const initCommand = require('../lib/commands/init');
      await initCommand(link, options, reporter);
    } catch (error) {
      reporter.error(`Initialization failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('generate <type> <name>')
  .alias('g')
  .description('Generate components, APIs, models, or features')
  .option('-d, --description <desc>', 'Description of the item to generate')
  .option('-p, --props <props>', 'Component props (JSON string)')
  .option('-f, --fields <fields>', 'Model fields (JSON string)')
  .option('-m, --methods <methods>', 'API methods (comma-separated)')
  .option('-t, --type <type>', 'Component type (functional|class)', 'functional')
  .option('-s, --styling <styling>', 'Styling approach (tailwind|css|styled)', 'tailwind')
  .option('--typescript', 'Use TypeScript', true)
  .option('--no-typescript', 'Use JavaScript instead of TypeScript')
  .option('--auth', 'Include authentication', true)
  .option('--no-auth', 'Skip authentication')
  .option('--database <db>', 'Database type (mongodb|postgresql)', 'mongodb')
  .option('--ai-key <key>', 'OpenAI API key for AI generation')
  .option('--ai-model <model>', 'AI model to use', 'gpt-4')
  .action(async (type, name, options) => {
    try {
      const { generateCommand } = require('../lib/commands/generate');
      await generateCommand(type, name, options, reporter);
    } catch (error) {
      reporter.error(`Generation failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('deploy <platform>')
  .description('Deploy application to various platforms')
  .option('-e, --environment <env>', 'Deployment environment (development|production)', 'production')
  .option('-a, --app <name>', 'Application name for deployment')
  .option('--cicd <platform>', 'Setup CI/CD (github-actions|gitlab-ci)')
  .option('--deploy', 'Actually deploy (not just configure)')
  .option('--production', 'Deploy to production environment')
  .option('--image <name>', 'Docker image name')
  .option('--run', 'Run Docker container after building')
  .action(async (platform, options) => {
    try {
      const { deployCommand } = require('../lib/commands/deploy');
      await deployCommand(platform, options, reporter);
    } catch (error) {
      reporter.error(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update CLI to latest version')
  .option('--beta', 'Install beta version')
  .action(async (options) => {
    try {
      // TODO: Implement update command
      reporter.info('Update command not yet implemented');
    } catch (error) {
      reporter.error(`Update failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Manage CLI configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration')
  .option('--reset', 'Reset configuration to defaults')
  .action(async (options) => {
    try {
      // TODO: Implement config command
      reporter.info('Config command not yet implemented');
    } catch (error) {
      reporter.error(`Configuration failed: ${error.message}`);
      process.exit(1);
    }
  });

// Help command
program
  .command('help [command]')
  .description('Display help for command')
  .action((command) => {
    if (command) {
      program.help({ command });
    } else {
      program.help();
    }
  });

// Error handling
program.on('command:*', (operands) => {
  console.error(chalk.red(`\n❌ Unknown command: ${operands[0]}`));
  console.log(chalk.yellow('💡 See --help for a list of available commands.\n'));
  process.exit(1);
});

// Handle global options
program.hook('preAction', (thisCommand, actionCommand) => {
  const opts = program.opts();
  
  if (opts.debug) {
    process.env.DEBUG = 'mern-ai:*';
    console.log(chalk.yellow('🐛 Debug mode enabled'));
  }
  
  if (opts.verbose) {
    process.env.VERBOSE = 'true';
    console.log(chalk.blue('📝 Verbose mode enabled'));
  }
});

// Graceful error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught Exception:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled Rejection at:'), promise, 'reason:', reason);
  if (process.env.DEBUG) {
    console.error(reason.stack);
  }
  process.exit(1);
});

// Parse arguments
if (process.argv.length <= 2) {
  program.help();
} else {
  program.parse();
}
