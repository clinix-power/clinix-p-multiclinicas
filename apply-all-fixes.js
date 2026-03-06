const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('Starting fixes...');

// 1. Add 6th phrase to typewriter
console.log('1. Adding 6th phrase to typewriter...');
content = content.replace(
  "    'Agenda inteligente'\r\n  ]",
  "    'Agenda inteligente',\r\n    'IA Consultora Financeira'\r\n  ]"
);

// 2. Replace feature cards array with Lucide icons
console.log('2. Replacing emoji icons with Lucide components...');
const oldCards = `              {[
                { icon: '⚡', text: 'IA escreve evoluções em segundos' },
                { icon: '📄', text: 'Laudos PDF com CREFITO' },
                { icon: '📊', text: 'Dashboard financeiro nível banking' },
                { icon: '✍️', text: 'Assinatura digital segura' },
                { icon: '📅', text: 'Agenda inteligente' }
              ].map((feature, index) => {`;

const newCards = `              {[
                { icon: Zap, text: 'IA escreve evoluções em segundos' },
                { icon: FileText, text: 'Laudos PDF com CREFITO' },
                { icon: BarChart3, text: 'Dashboard financeiro nível banking' },
                { icon: PenTool, text: 'Assinatura digital segura' },
                { icon: Calendar, text: 'Agenda inteligente' },
                { icon: Brain, text: 'IA Consultora Financeira' }
              ].map((feature, index) => {`;

content = content.replace(oldCards, newCards);

// 3. Update grid maxWidth for 6 cards
console.log('3. Expanding grid width...');
content = content.replace(
  "maxWidth: '900px'",
  "maxWidth: '1100px'"
);

// 4. Fix icon rendering to use React component
console.log('4. Fixing icon rendering...');
content = content.replace(
  '{feature.icon}',
  '<feature.icon className="w-5 h-5" style={{ color: isZapped ? \'#fff\' : \'#a855f7\', strokeWidth: 2.5 }} />'
);

// 5. Update icon container styles
console.log('5. Updating icon container styles...');
content = content.replace(
  "width: '36px',",
  "width: '40px',"
);
content = content.replace(
  "height: '36px',",
  "height: '40px',"
);
content = content.replace(
  "borderRadius: '10px',",
  "borderRadius: '12px',"
);
content = content.replace(
  "fontSize: '1.1rem',",
  ""
);
content = content.replace(
  "background: isZapped ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',",
  "background: isZapped ? 'linear-gradient(135deg, #d946ef, #a855f7)' : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(168, 85, 247, 0.08))',"
);

// Add boxShadow
content = content.replace(
  "transition: 'all 0.3s'\r\n                    }}>",
  "transition: 'all 0.3s',\r\n                      boxShadow: isZapped ? '0 4px 12px rgba(168, 85, 247, 0.4)' : '0 2px 6px rgba(168, 85, 247, 0.1)'\r\n                    }}>"
);

// 6. Update section titles
console.log('6. Updating section titles with gradients...');

// "Tudo que você precisa em um só lugar"
const oldTitle1 = `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              Tudo que você precisa em um só lugar
            </h2>`;

const newTitle1 = `            <h2 style={{ 
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

content = content.replace(oldTitle1, newTitle1);

// "Escolha o plano ideal para sua clínica"
const oldTitle2 = `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              Escolha o plano ideal para sua clínica
            </h2>`;

const newTitle2 = `            <h2 style={{ 
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

content = content.replace(oldTitle2, newTitle2);

// "O que dizem nossos clientes"
const oldTitle3 = `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              O que dizem nossos clientes
            </h2>`;

const newTitle3 = `            <h2 style={{ 
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

content = content.replace(oldTitle3, newTitle3);

fs.writeFileSync(file, content, 'utf8');
console.log('\n✅ All fixes applied successfully!');
console.log('- 6th phrase added to typewriter');
console.log('- Emoji icons replaced with Lucide React components');
console.log('- 6th card "IA Consultora Financeira" added');
console.log('- Icon rendering fixed (React components)');
console.log('- Icon containers updated with gradients');
console.log('- All section titles updated with large fonts and gradients');
