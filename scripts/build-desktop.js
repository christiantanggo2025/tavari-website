const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DesktopBuilder {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.distPath = path.join(this.projectRoot, 'dist');
    this.buildPath = path.join(this.projectRoot, 'build');
  }

  async buildAll() {
    console.log('🚀 Starting Tavari Music Desktop build...');
    
    try {
      // Step 1: Build React app
      console.log('📦 Building React application...');
      execSync('npm run build', { stdio: 'inherit', cwd: this.projectRoot });
      
      // Step 2: Prepare Electron assets
      console.log('⚡ Preparing Electron assets...');
      this.prepareElectronAssets();
      
      // Step 3: Build Electron app
      console.log('🖥️ Building Electron application...');
      execSync('npm run electron-build', { stdio: 'inherit', cwd: this.projectRoot });
      
      // Step 4: Generate update manifest
      console.log('📋 Generating update manifest...');
      this.generateUpdateManifest();
      
      // Step 5: Create installer
      console.log('📦 Creating installer package...');
      await this.createInstaller();
      
      console.log('✅ Build completed successfully!');
      this.printBuildSummary();
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  prepareElectronAssets() {
    // Copy remote control web interface
    const remoteWebSource = path.join(this.projectRoot, 'electron/remote-web');
    const remoteWebDest = path.join(this.buildPath, 'remote-web');
    
    if (fs.existsSync(remoteWebSource)) {
      this.copyRecursive(remoteWebSource, remoteWebDest);
    }
    
    // Copy electron files
    const electronSource = path.join(this.projectRoot, 'electron');
    const electronDest = path.join(this.buildPath, 'electron');
    
    if (!fs.existsSync(electronDest)) {
      fs.mkdirSync(electronDest, { recursive: true });
    }
    
    // Copy main electron files
    const electronFiles = ['main.js', 'preload.js', 'autoUpdater.js', 'licensing.js'];
    electronFiles.forEach(file => {
      const src = path.join(electronSource, file);
      const dest = path.join(electronDest, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
  }

  copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    items.forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  generateUpdateManifest() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json')));
    const version = packageJson.version;
    
    // Find the built installer
    const installerPattern = /Tavari.*Setup.*\.exe$/;
    const distFiles = fs.readdirSync(this.distPath);
    const installerFile = distFiles.find(file => installerPattern.test(file));
    
    if (installerFile) {
      const UpdateDistribution = require('./updateDistribution');
      const distributor = new UpdateDistribution();
      distributor.generateManifest(version, installerFile);
    }
  }

  async createInstaller() {
    // Additional installer customization
    const installerConfig = {
      productName: 'Tavari Music Desktop',
      companyName: 'Tavari Systems',
      description: 'Professional background music system',
      version: JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'))).version,
      buildDate: new Date().toISOString()
    };
    
    console.log('Installer configuration:', installerConfig);
  }

  printBuildSummary() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json')));
    const distFiles = fs.readdirSync(this.distPath);
    
    console.log('\n📊 Build Summary:');
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   Files created:`);
    
    distFiles.forEach(file => {
      const filePath = path.join(this.distPath, file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   - ${file} (${sizeInMB} MB)`);
    });
    
    console.log(`\n📁 Output directory: ${this.distPath}`);
    console.log(`\n🎉 Ready for distribution!`);
  }
}

// Run build if called directly
if (require.main === module) {
  const builder = new DesktopBuilder();
  builder.buildAll();
}

module.exports = DesktopBuilder;