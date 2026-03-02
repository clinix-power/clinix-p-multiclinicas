/**
 * Script para gerar ícones PNG a partir do icon.svg
 * 
 * Uso:
 * 1. Instale sharp: npm install --save-dev sharp
 * 2. Execute: node scripts/generate-icons.js
 * 
 * Alternativa sem dependências:
 * 1. Abra https://realfavicongenerator.net
 * 2. Faça upload do public/icon.svg
 * 3. Baixe os ícones gerados
 * 4. Substitua os arquivos em public/
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Tenta importar sharp
    const sharp = require('sharp');
    
    const svgPath = path.join(__dirname, '../public/icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);
    
    const sizes = [
      { size: 192, name: 'icon-192.png' },
      { size: 512, name: 'icon-512.png' },
      { size: 180, name: 'apple-touch-icon.png' }
    ];
    
    for (const { size, name } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, '../public', name));
      
      console.log(`✓ Gerado: ${name} (${size}x${size})`);
    }
    
    console.log('\n✅ Todos os ícones foram gerados com sucesso!');
    console.log('🔄 Execute "npm run build" para reconstruir o PWA.');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Sharp não está instalado.');
      console.log('\n📦 Instale com: npm install --save-dev sharp');
      console.log('🔄 Depois execute: node scripts/generate-icons.js');
      console.log('\n--- OU ---\n');
      console.log('🌐 Use: https://realfavicongenerator.net');
      console.log('   1. Faça upload de public/icon.svg');
      console.log('   2. Baixe os ícones gerados');
      console.log('   3. Substitua em public/');
    } else {
      console.error('❌ Erro ao gerar ícones:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
