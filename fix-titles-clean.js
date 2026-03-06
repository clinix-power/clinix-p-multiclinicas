const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('Atualizando títulos...\n');

// Title 1: "Tudo que você precisa em um só lugar"
const old1 = `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>

              Tudo que você precisa em um só lugar

            </h2>`;

const new1 = `            <h2 style={{ 
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

content = content.replace(old1, new1);
console.log('✓ Título 1 atualizado');

// Title 2: "Escolha o plano ideal para sua clínica"
const old2 = `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>

              Escolha o plano ideal para sua clínica

            </h2>`;

const new2 = `            <h2 style={{ 
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

content = content.replace(old2, new2);
console.log('✓ Título 2 atualizado');

// Title 3: "O que dizem nossos clientes"
const old3 = `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>

              O que dizem nossos clientes

            </h2>`;

const new3 = `            <h2 style={{ 
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

content = content.replace(old3, new3);
console.log('✓ Título 3 atualizado');

fs.writeFileSync(file, content, 'utf8');

console.log('\n✅ CONCLUÍDO! Seus títulos agora estão GRANDES:');
console.log('   📏 Tamanho: 2rem a 3rem (responsivo)');
console.log('   🎨 Fonte: Outfit (mesma do título principal)');
console.log('   🌈 Gradiente: roxo-azul');
console.log('   💪 Peso: 900 (extra bold)');
