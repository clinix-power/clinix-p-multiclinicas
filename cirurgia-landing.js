const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('Executando cirurgias na landing page...\n');

// CIRURGIA 1: Remover título h1 "Sua clínica merece mais do que planilha e papel"
const h1Regex = /<h1 style=\{\{[^}]+\}\}>\s*<span style=\{\{[^}]+\}\}>Sua clínica merece mais<\/span>\s*<span style=\{\{[^}]+\}\}>do que planilha e papel\.<\/span>\s*<\/h1>\s*/s;

if (h1Regex.test(content)) {
  content = content.replace(h1Regex, '');
  console.log('✓ CIRURGIA 1: Título h1 removido');
} else {
  console.log('⚠ CIRURGIA 1: Título h1 não encontrado (pode já ter sido removido)');
}

// CIRURGIA 2: Adicionar frase no array phrases
const oldPhrases = `const phrases = [
    'IA escreve evoluções em segundos',
    'Laudos PDF com CREFITO',
    'Dashboard financeiro nível banking',
    'Assinatura digital segura',
    'Agenda inteligente'
  ]`;

const newPhrases = `const phrases = [
    'Sua clínica merece mais do que planilha e papel',
    'IA escreve evoluções em segundos',
    'Laudos PDF com CREFITO',
    'Dashboard financeiro nível banking',
    'Assinatura digital segura',
    'Agenda inteligente'
  ]`;

if (content.includes(oldPhrases)) {
  content = content.replace(oldPhrases, newPhrases);
  console.log('✓ CIRURGIA 2: Frase adicionada ao typewriter da Consultora IA');
} else {
  console.log('⚠ CIRURGIA 2: Array phrases não encontrado no formato esperado');
}

// CIRURGIA 3: Remover grid dos 5 cards iniciais
const cardsRegex = /\{\/\* Feature Pills Grid \*\/\}\s*<div id="fc-grid"[\s\S]*?\{feature\.text\}\s*<\/span>\s*<\/div>\s*\)\s*\}\)\}\s*<\/div>/;

if (cardsRegex.test(content)) {
  content = content.replace(cardsRegex, '');
  console.log('✓ CIRURGIA 3: Grid dos 5 cards iniciais removido');
} else {
  console.log('⚠ CIRURGIA 3: Grid de cards não encontrado (pode já ter sido removido)');
}

fs.writeFileSync(file, content, 'utf8');
console.log('\n✅ Cirurgias concluídas! Arquivo salvo.');
