$file = "c:\Clinix Power Multi\app\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

# 1. Add 6th phrase to typewriter
$content = $content.Replace(
    "    'Agenda inteligente'`n  ]",
    "    'Agenda inteligente',`n    'IA Consultora Financeira'`n  ]"
)

# 2. Replace emoji icons with Lucide components and add 6th card
$content = $content.Replace(
    "                { icon: '⚡', text: 'IA escreve evoluções em segundos' },",
    "                { icon: Zap, text: 'IA escreve evoluções em segundos' },"
)
$content = $content.Replace(
    "                { icon: '📄', text: 'Laudos PDF com CREFITO' },",
    "                { icon: FileText, text: 'Laudos PDF com CREFITO' },"
)
$content = $content.Replace(
    "                { icon: '📊', text: 'Dashboard financeiro nível banking' },",
    "                { icon: BarChart3, text: 'Dashboard financeiro nível banking' },"
)
$content = $content.Replace(
    "                { icon: '✍️', text: 'Assinatura digital segura' },",
    "                { icon: PenTool, text: 'Assinatura digital segura' },"
)
$content = $content.Replace(
    "                { icon: '📅', text: 'Agenda inteligente' }",
    "                { icon: Calendar, text: 'Agenda inteligente' },`n                { icon: Brain, text: 'IA Consultora Financeira' }"
)

# 3. Update icon rendering to use Lucide components
$oldIconDiv = @"
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isZapped ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                      border: `1px solid ${isZapped ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.12)'}`,
                      transition: 'all 0.3s'
                    }}>
                      {feature.icon}
                    </div>
"@

$newIconDiv = @"
                    <div style={{
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
                      border: `1px solid ${isZapped ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.15)'}`,
                      transition: 'all 0.3s',
                      boxShadow: isZapped ? '0 4px 12px rgba(168, 85, 247, 0.4)' : '0 2px 6px rgba(168, 85, 247, 0.1)'
                    }}>
                      <feature.icon className="w-5 h-5" style={{ color: isZapped ? '#fff' : '#a855f7', strokeWidth: 2.5 }} />
                    </div>
"@

$content = $content.Replace($oldIconDiv, $newIconDiv)

# 4. Update section titles to use gradient and larger font
$content = $content.Replace(
    '            <h2 className="font-bold mb-4" style={{ fontSize: ''1.4rem'', letterSpacing: ''-.04em'', color: ''rgba(18,18,28,.92)'' }}>
              Tudo que você precisa em um só lugar
            </h2>',
    '            <h2 style={{ 
              fontFamily: ''"Outfit", sans-serif'',
              fontSize: ''clamp(2rem, 4vw, 3rem)'',
              fontWeight: 900,
              letterSpacing: ''-.055em'',
              background: ''linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)'',
              WebkitBackgroundClip: ''text'',
              WebkitTextFillColor: ''transparent'',
              backgroundClip: ''text'',
              marginBottom: ''1rem''
            }}>
              Tudo que você precisa em um só lugar
            </h2>'
)

$content = $content.Replace(
    '            <h2 className="font-bold mb-4" style={{ fontSize: ''1.4rem'', letterSpacing: ''-.04em'', color: ''rgba(18,18,28,.92)'' }}>
              Escolha o plano ideal para sua clínica
            </h2>',
    '            <h2 style={{ 
              fontFamily: ''"Outfit", sans-serif'',
              fontSize: ''clamp(2rem, 4vw, 3rem)'',
              fontWeight: 900,
              letterSpacing: ''-.055em'',
              background: ''linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)'',
              WebkitBackgroundClip: ''text'',
              WebkitTextFillColor: ''transparent'',
              backgroundClip: ''text'',
              marginBottom: ''1rem''
            }}>
              Escolha o plano ideal para sua clínica
            </h2>'
)

$content = $content.Replace(
    '            <h2 className="font-bold mb-4" style={{ fontSize: ''1.4rem'', letterSpacing: ''-.04em'', color: ''rgba(18,18,28,.92)'' }}>
              O que dizem nossos clientes
            </h2>',
    '            <h2 style={{ 
              fontFamily: ''"Outfit", sans-serif'',
              fontSize: ''clamp(2rem, 4vw, 3rem)'',
              fontWeight: 900,
              letterSpacing: ''-.055em'',
              background: ''linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)'',
              WebkitBackgroundClip: ''text'',
              WebkitTextFillColor: ''transparent'',
              backgroundClip: ''text'',
              marginBottom: ''1rem''
            }}>
              O que dizem nossos clientes
            </h2>'
)

# Save
$content | Set-Content $file -Encoding UTF8 -NoNewline
Write-Host "✓ Landing page updated successfully!"
