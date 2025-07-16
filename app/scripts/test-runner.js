
#!/usr/bin/env node

/**
 * Comprehensive test runner for AfricanMarket application
 * Usage: node scripts/test-runner.js [options]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: null,
      integration: null,
      performance: null,
      coverage: null
    };
    this.startTime = Date.now();
  }

  // Run command and return promise
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`\n🔄 Running: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          resolve({ success: false, code });
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Run unit tests
  async runUnitTests() {
    console.log('\n📊 Running Unit Tests...');
    const result = await this.runCommand('npx', [
      'jest',
      '--testPathPattern=__tests__',
      '--testPathIgnorePatterns=integration,performance',
      '--verbose'
    ]);
    
    this.testResults.unit = result;
    return result;
  }

  // Run integration tests
  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    const result = await this.runCommand('npx', [
      'jest',
      '--testPathPattern=integration',
      '--verbose'
    ]);
    
    this.testResults.integration = result;
    return result;
  }

  // Run performance tests
  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    const result = await this.runCommand('npx', [
      'jest',
      '--testPathPattern=performance',
      '--verbose'
    ]);
    
    this.testResults.performance = result;
    return result;
  }

  // Run tests with coverage
  async runCoverageTests() {
    console.log('\n📈 Running Tests with Coverage...');
    const result = await this.runCommand('npx', [
      'jest',
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=lcov',
      '--coverageReporters=html'
    ]);
    
    this.testResults.coverage = result;
    return result;
  }

  // Type check
  async runTypeCheck() {
    console.log('\n🔍 Running TypeScript Type Check...');
    return await this.runCommand('npx', ['tsc', '--noEmit']);
  }

  // Lint check
  async runLintCheck() {
    console.log('\n🧹 Running ESLint Check...');
    return await this.runCommand('npx', ['eslint', '.', '--ext', '.ts,.tsx']);
  }

  // Build check
  async runBuildCheck() {
    console.log('\n🔨 Running Build Check...');
    return await this.runCommand('npm', ['run', 'build']);
  }

  // Generate test report
  generateReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST EXECUTION REPORT');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Total Duration: ${duration.toFixed(2)}s`);
    console.log(`📅 Date: ${new Date().toISOString()}`);
    
    console.log('\n📊 Test Results:');
    
    Object.entries(this.testResults).forEach(([type, result]) => {
      if (result) {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`  ${type.padEnd(15)}: ${status} (exit code: ${result.code})`);
      } else {
        console.log(`  ${type.padEnd(15)}: ⏭️  SKIPPED`);
      }
    });
    
    // Overall status
    const failures = Object.values(this.testResults).filter(r => r && !r.success).length;
    const overall = failures === 0 ? '✅ ALL TESTS PASSED' : `❌ ${failures} TEST SUITE(S) FAILED`;
    
    console.log(`\n🎯 Overall Status: ${overall}`);
    console.log('='.repeat(60));
    
    return failures === 0;
  }

  // Run all tests
  async runAll() {
    console.log('🚀 Starting Comprehensive Test Suite for AfricanMarket');
    console.log('=' .repeat(60));
    
    let allPassed = true;
    
    try {
      // Type check first
      const typeCheck = await this.runTypeCheck();
      if (!typeCheck.success) {
        console.log('❌ Type check failed, stopping tests');
        allPassed = false;
        return allPassed;
      }
      
      // Lint check
      const lintCheck = await this.runLintCheck();
      if (!lintCheck.success) {
        console.log('⚠️  Lint check failed, continuing with tests');
      }
      
      // Unit tests
      const unitTests = await this.runUnitTests();
      if (!unitTests.success) {
        allPassed = false;
      }
      
      // Integration tests
      const integrationTests = await this.runIntegrationTests();
      if (!integrationTests.success) {
        allPassed = false;
      }
      
      // Performance tests
      const performanceTests = await this.runPerformanceTests();
      if (!performanceTests.success) {
        allPassed = false;
      }
      
      // Coverage tests
      const coverageTests = await this.runCoverageTests();
      if (!coverageTests.success) {
        allPassed = false;
      }
      
      // Build check
      const buildCheck = await this.runBuildCheck();
      if (!buildCheck.success) {
        console.log('❌ Build check failed');
        allPassed = false;
      }
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      allPassed = false;
    }
    
    return this.generateReport();
  }

  // Run specific test type
  async runSpecific(testType) {
    console.log(`🎯 Running ${testType} tests only`);
    
    switch (testType) {
      case 'unit':
        return await this.runUnitTests();
      case 'integration':
        return await this.runIntegrationTests();
      case 'performance':
        return await this.runPerformanceTests();
      case 'coverage':
        return await this.runCoverageTests();
      case 'type':
        return await this.runTypeCheck();
      case 'lint':
        return await this.runLintCheck();
      case 'build':
        return await this.runBuildCheck();
      default:
        console.log(`❌ Unknown test type: ${testType}`);
        return { success: false, code: 1 };
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  let success = false;
  
  if (args.length === 0) {
    // Run all tests
    success = await runner.runAll();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
AfricanMarket Test Runner

Usage: node scripts/test-runner.js [options]

Options:
  --help, -h          Show this help message
  --unit              Run unit tests only
  --integration       Run integration tests only
  --performance       Run performance tests only
  --coverage          Run tests with coverage
  --type              Run TypeScript type check
  --lint              Run ESLint check
  --build             Run build check
  --all               Run all tests (default)

Examples:
  node scripts/test-runner.js                    # Run all tests
  node scripts/test-runner.js --unit             # Run unit tests only
  node scripts/test-runner.js --coverage         # Run tests with coverage
    `);
    process.exit(0);
  } else {
    // Run specific test type
    const testType = args[0].replace('--', '');
    const result = await runner.runSpecific(testType);
    success = result.success;
    
    if (success) {
      console.log(`✅ ${testType} tests passed`);
    } else {
      console.log(`❌ ${testType} tests failed`);
    }
  }
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
