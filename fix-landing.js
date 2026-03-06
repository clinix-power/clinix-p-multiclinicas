const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add 6th phrase to typewriter
content = content.replace(
  "    'Agenda inteligente'\n  ]",
  "    'Agenda inteligente',\n    'IA Consultora Financeira'\n  ]"
);

// 2. Increase grid width for 6 cards
content = content.replace(
  "maxWidth: '900px'",
  "maxWidth: '1100px'"
);

// 3. Replace feature cards array - using regex to match any emoji
const oldCards = /\{\[\s*\{ icon: '[^']+', text: 'IA escreve evoluções em segundos' \},\s*\{ icon: '[^']+', text: 'Laudos PDF com CREFITO' \},\s*\{ icon: '[^']+', text: 'Dashboard financeiro nível banking' \},\s*\{ icon: '[^']+', text: 'Assinatura digital segura' \},\s*\{ icon: '[^']+', text: 'Agenda inteligente' \}\s*\]/;

const newCards = `{[
                { icon: Zap, text: 'IA escreve evoluções em segundos' },
                { icon: FileText, text: 'Laudos PDF com CREFITO' },
                { icon: BarChart3, text: 'Dashboard financeiro nível banking' },
                { icon: PenTool, text: 'Assinatura digital segura' },
                { icon: Calendar, text: 'Agenda inteligente' },
                { icon: Brain, text: 'IA Consultora Financeira' }
              ]`;

content = content.replace(oldCards, newCards);

// 4. Update icon rendering
const oldIconDiv = `                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isZapped ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                      border: \`1px solid \${isZapped ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.12)'}\`,
                      transition: 'all 0.3s'
                    }}>
                      {feature.icon}
                    </div>`;

const newIconDiv = `                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: isZapped 
                        ? 'linear-gradient(135deg, #d946ef, #a855f7)' 
                        : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(168, 85, 247, 0.08))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: \`1px solid \${isZapped ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.15)'}\`,
                      transition: 'all 0.3s',
                      boxShadow: isZapped ? '0 4px 12px rgba(168, 85, 247, 0.4)' : '0 2px 6px rgba(168, 85, 247, 0.1)'
                    }}>
                      <feature.icon className="w-5 h-5" style={{ color: isZapped ? '#fff' : '#a855f7', strokeWidth: 2.5 }} />
                    </div>`;

content = content.replace(oldIconDiv, newIconDiv);

// 5. Update section titles
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

// 6. Update comparison section titles
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
console.log('✓ Landing page updated successfully!');
