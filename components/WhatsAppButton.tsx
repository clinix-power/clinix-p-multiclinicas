'use client'

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/message/VQUXNOXPMPT6M1"
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-95"
      style={{
        background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.28)',
      }}
      aria-label="Fale conosco no WhatsApp"
    >
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-2 right-0 translate-y-[-100%] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
      >
        <span
          className="relative block rounded-xl px-3 py-2 text-[11px] font-semibold whitespace-nowrap"
          style={{
            background: 'rgba(15, 15, 20, 0.90)',
            color: 'rgba(255,255,255,0.92)',
            boxShadow: '0 14px 35px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
          }}
        >
          Suporte no WhatsApp
          <span
            aria-hidden="true"
            className="absolute bottom-[-6px] right-6 h-3 w-3 rotate-45"
            style={{
              background: 'rgba(15, 15, 20, 0.90)',
              borderRight: '1px solid rgba(255,255,255,0.12)',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        </span>
      </span>

      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
        }}
      />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2.25C6.615 2.25 2.25 6.615 2.25 12c0 1.665.42 3.23 1.16 4.598L2.25 21.75l5.3-1.15A9.7 9.7 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 17.4a7.7 7.7 0 0 1-3.94-1.09l-.28-.165-3.15.685.77-3.02-.18-.29A7.7 7.7 0 0 1 4.35 12c0-4.225 3.425-7.65 7.65-7.65S19.65 7.775 19.65 12 16.225 19.65 12 19.65Z"
          fill="rgba(255,255,255,0.95)"
        />
        <path
          d="M16.82 14.34c-.27-.135-1.6-.79-1.85-.88-.25-.09-.44-.135-.625.135-.18.27-.7.88-.86 1.06-.16.18-.325.205-.595.07-.27-.135-1.145-.42-2.18-1.35-.805-.72-1.35-1.61-1.51-1.88-.16-.27-.015-.415.12-.55.12-.12.27-.315.405-.475.135-.16.18-.27.27-.45.09-.18.045-.335-.02-.475-.07-.135-.61-1.48-.84-2.03-.22-.53-.445-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.715.34-.245.27-.94.92-.94 2.25s.965 2.62 1.1 2.8c.135.18 1.9 2.9 4.6 4.07.64.28 1.14.44 1.53.56.65.205 1.24.175 1.705.105.52-.08 1.6-.655 1.825-1.28.225-.625.225-1.165.16-1.28-.07-.115-.25-.18-.52-.315"
          fill="rgba(255,255,255,0.95)"
        />
      </svg>
    </a>
  )
}
