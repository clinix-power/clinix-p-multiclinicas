const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('CIRURGIA 2: Adicionando frase ao typewriter...\n');

// Procurar pelo array phrases usando regex mais flexível
const phrasesRegex = /const phrases = \[\s*'IA escreve evoluções em segundos',/;

if (phrasesRegex.test(content)) {
  // Adicionar a nova frase como primeira do array
  content = content.replace(
    /const phrases = \[\s*/,
    "const phrases = [\n    'Sua clínica merece mais do que planilha e papel',\n    "
  );
  console.log('✓ Frase adicionada como primeira no array phrases');
} else {
  console.log('⚠ Array phrases não encontrado - verificando estado atual...');
  
  // Verificar se já foi adicionada
  if (content.includes("'Sua clínica merece mais do que planilha e papel'")) {
    console.log('✓ Frase já está presente no array phrases');
  } else {
    console.log('✗ ERRO: Não foi possível localizar o array phrases');
    process.exit(1);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('\n✅ CIRURGIA 2 concluída!');
