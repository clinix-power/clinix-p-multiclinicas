const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('Atualizando títulos com regex...\n');

// Regex pattern para encontrar os títulos antigos (com ou sem linhas em branco)
const pattern1 = /<h2 className="font-bold mb-4" style=\{\{ fontSize: '1\.4rem', letterSpacing: '-\.04em', color: 'rgba\(18,18,28,\.92\)' \}\}>\s*Tudo que você precisa em um só lugar\s*<\/h2>/;

const replacement1 = `<h2 style={{ 
              fontFamily: '"Outfit", sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-.055em',
              background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem'
            }}>
              Tudo que você precisa em um só lugar
            </h2>`;

if (pattern1.test(content)) {
  content = content.replace(pattern1, replacement1);
  console.log('✓ "Tudo que você precisa em um só lugar" - ATUALIZADO');
} else {
  console.log('⚠ "Tudo que você precisa em um só lugar" - não encontrado ou já atualizado');
}

// Pattern 2
const pattern2 = /<h2 className="font-bold mb-4" style=\{\{ fontSize: '1\.4rem', letterSpacing: '-\.04em', color: 'rgba\(18,18,28,\.92\)' \}\}>\s*Escolha o plano ideal para sua clínica\s*<\/h2>/;

const replacement2 = `<h2 style={{ 
              fontFamily: '"Outfit", sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-.055em',
              background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem'
            }}>
              Escolha o plano ideal para sua clínica
            </h2>`;

if (pattern2.test(content)) {
  content = content.replace(pattern2, replacement2);
  console.log('✓ "Escolha o plano ideal para sua clínica" - ATUALIZADO');
} else {
  console.log('⚠ "Escolha o plano ideal para sua clínica" - não encontrado ou já atualizado');
}

// Pattern 3
const pattern3 = /<h2 className="font-bold mb-4" style=\{\{ fontSize: '1\.4rem', letterSpacing: '-\.04em', color: 'rgba\(18,18,28,\.92\)' \}\}>\s*O que dizem nossos clientes\s*<\/h2>/;

const replacement3 = `<h2 style={{ 
              fontFamily: '"Outfit", sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-.055em',
              background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem'
            }}>
              O que dizem nossos clientes
            </h2>`;

if (pattern3.test(content)) {
  content = content.replace(pattern3, replacement3);
  console.log('✓ "O que dizem nossos clientes" - ATUALIZADO');
} else {
  console.log('⚠ "O que dizem nossos clientes" - não encontrado ou já atualizado');
}

fs.writeFileSync(file, content, 'utf8');

console.log('\n✅ PRONTO! Títulos grandes com gradiente aplicados!');
