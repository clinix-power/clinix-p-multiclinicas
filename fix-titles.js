const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update section titles with gradient and larger fonts
const titles = [
  {
    old: `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              Tudo que você precisa em um só lugar
            </h2>`,
    new: `            <h2 style={{ 
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
            </h2>`
  },
  {
    old: `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              Escolha o plano ideal para sua clínica
            </h2>`,
    new: `            <h2 style={{ 
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
            </h2>`
  },
  {
    old: `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              O que dizem nossos clientes
            </h2>`,
    new: `            <h2 style={{ 
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
            </h2>`
  }
];

titles.forEach(({ old, new: newTitle }) => {
  content = content.replace(old, newTitle);
});

// Update comparison section titles
content = content.replace(
  `              <h3 className="text-lg font-bold mb-6" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.02em' }}>
                Fisioterapia Comum
              </h3>`,
  `              <h3 style={{ 
                fontFamily: '"Outfit", sans-serif',
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800,
                letterSpacing: '-.045em',
                color: 'rgba(18,18,28,.92)',
                marginBottom: '1.5rem'
              }}>
                Fisioterapia Comum
              </h3>`
);

content = content.replace(
  `              <h3 className="text-lg font-bold mb-6" style={{ color: '#a855f7', letterSpacing: '-.02em' }}>
                Fisioterapia do Futuro
              </h3>`,
  `              <h3 style={{ 
                fontFamily: '"Outfit", sans-serif',
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800,
                letterSpacing: '-.045em',
                background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '1.5rem'
              }}>
                Fisioterapia do Futuro
              </h3>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('✓ All section titles updated with gradients and larger fonts!');
