import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface SamplePhotosPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (base64OrSvg: string) => void;
}

// Quick high-contrast SVG images with foreign text that render into clean base64 data URLs
const SAMPLE_PREVIEWS = [
  {
    title: 'Cartel de Calle (Japonés)',
    language: 'Japonés',
    renderSvg: () => `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <rect x="60" y="80" width="680" height="440" rx="20" fill="#f8fafc" stroke="#e2e8f0" stroke-width="8"/>
        <rect x="80" y="100" width="640" height="90" rx="10" fill="#dc2626"/>
        <text x="400" y="160" font-family="sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle">立入禁止 (DANGER)</text>
        <text x="400" y="270" font-family="sans-serif" font-size="52" font-weight="bold" fill="#0f172a" text-anchor="middle">関係者以外立入禁止</text>
        <text x="400" y="340" font-family="sans-serif" font-size="34" font-weight="bold" fill="#334155" text-anchor="middle">KEEP OUT - AUTHORIZED PERSONNEL ONLY</text>
        <text x="400" y="420" font-family="sans-serif" font-size="28" fill="#64748b" text-anchor="middle">工事中のため危険ですので立ち入らないでください。</text>
        <rect x="250" y="460" width="300" height="40" rx="8" fill="#e2e8f0"/>
        <text x="400" y="488" font-family="sans-serif" font-size="22" font-weight="bold" fill="#475569" text-anchor="middle">安全第一 (Safety First)</text>
      </svg>
    `,
  },
  {
    title: 'Menú de Restaurante (Italiano)',
    language: 'Italiano',
    renderSvg: () => `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="100%" height="100%" fill="#fef3c7"/>
        <rect x="40" y="40" width="720" height="520" rx="16" fill="#fffbeb" stroke="#b45309" stroke-width="6"/>
        <text x="400" y="110" font-family="serif" font-size="44" font-weight="bold" fill="#78350f" text-anchor="middle">OSTERIA DEL SOLE</text>
        <text x="400" y="150" font-family="serif" font-size="24" font-style="italic" fill="#92400e" text-anchor="middle">Specialità della Casa</text>
        <line x1="160" y1="170" x2="640" y2="170" stroke="#b45309" stroke-width="2"/>
        
        <text x="120" y="220" font-family="sans-serif" font-size="30" font-weight="bold" fill="#1c1917">Tagliatelle al Tartufo Nero</text>
        <text x="680" y="220" font-family="sans-serif" font-size="30" font-weight="bold" fill="#78350f" text-anchor="end">€ 18,50</text>
        <text x="120" y="255" font-family="sans-serif" font-size="22" fill="#57534e">Pasta fresca fatta in casa con crema di burro e tartufo fresco estivo.</text>

        <text x="120" y="320" font-family="sans-serif" font-size="30" font-weight="bold" fill="#1c1917">Risotto ai Funghi Porcini</text>
        <text x="680" y="320" font-family="sans-serif" font-size="30" font-weight="bold" fill="#78350f" text-anchor="end">€ 16,00</text>
        <text x="120" y="355" font-family="sans-serif" font-size="22" fill="#57534e">Riso Carnaroli mantecato al Parmigiano Reggiano 24 mesi.</text>

        <text x="120" y="420" font-family="sans-serif" font-size="30" font-weight="bold" fill="#1c1917">Tiramisù Tradizionale</text>
        <text x="680" y="420" font-family="sans-serif" font-size="30" font-weight="bold" fill="#78350f" text-anchor="end">€ 7,00</text>
        <text x="120" y="455" font-family="sans-serif" font-size="22" fill="#57534e">Savoiardi bagnati nel caffè espresso con crema di mascarpone fresco.</text>
        
        <text x="400" y="520" font-family="sans-serif" font-size="18" fill="#78350f" text-anchor="middle">Coperto e servizio inclusi nel prezzo • Buon Appetito!</text>
      </svg>
    `,
  },
  {
    title: 'Aviso de Estación (Alemán)',
    language: 'Alemán',
    renderSvg: () => `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="100%" height="100%" fill="#0f172a"/>
        <rect x="50" y="50" width="700" height="500" rx="16" fill="#1e293b" stroke="#38bdf8" stroke-width="6"/>
        <rect x="80" y="80" width="640" height="70" rx="8" fill="#0284c7"/>
        <text x="400" y="128" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">FAHRGASTINFORMATION</text>
        <text x="100" y="210" font-family="sans-serif" font-size="32" font-weight="bold" fill="#ffffff">Sehr geehrte Fahrgäste,</text>
        <text x="100" y="260" font-family="sans-serif" font-size="26" fill="#cbd5e1">Wegen kurzfristiger Gleisarbeiten kommt es heute zu Verspätungen.</text>
        <text x="100" y="310" font-family="sans-serif" font-size="26" fill="#cbd5e1">Der Zug ICE 782 nach München Hauptbahnhof fährt heute abweichend von Gleis 7 ab.</text>
        <text x="100" y="380" font-family="sans-serif" font-size="26" fill="#facc15" font-weight="bold">Bitte achten Sie auf die Lautsprecheransagen und geänderte Wagenreihung.</text>
        <text x="100" y="450" font-family="sans-serif" font-size="22" fill="#94a3b8">Wir bitten um Ihr Verständnis für diese Unannehmlichkeiten.</text>
        <text x="700" y="510" font-family="sans-serif" font-size="20" fill="#38bdf8" text-anchor="end">Deutsche Bahn AG</text>
      </svg>
    `,
  },
  {
    title: 'Receta de Cocina (Francés)',
    language: 'Francés',
    renderSvg: () => `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="40" y="40" width="720" height="520" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
        <text x="400" y="100" font-family="serif" font-size="36" font-weight="bold" fill="#1e293b" text-anchor="middle">Crêpes Traditionnelles Françaises</text>
        <line x1="100" y1="120" x2="700" y2="120" stroke="#0284c7" stroke-width="3"/>
        
        <text x="80" y="170" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Ingrédients:</text>
        <text x="80" y="210" font-family="sans-serif" font-size="22" fill="#334155">• 250g de farine de blé</text>
        <text x="80" y="245" font-family="sans-serif" font-size="22" fill="#334155">• 4 œufs entiers frais</text>
        <text x="80" y="280" font-family="sans-serif" font-size="22" fill="#334155">• 500ml de lait demi-écrémé</text>
        <text x="80" y="315" font-family="sans-serif" font-size="22" fill="#334155">• 50g de beurre fondu</text>
        <text x="80" y="350" font-family="sans-serif" font-size="22" fill="#334155">• 1 pincée de sel et 1 cuillère à soupe de sucre</text>

        <text x="80" y="410" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Préparation:</text>
        <text x="80" y="450" font-family="sans-serif" font-size="21" fill="#334155">1. Mélanger la farine avec les œufs et le sel dans un grand saladier.</text>
        <text x="80" y="485" font-family="sans-serif" font-size="21" fill="#334155">2. Verser le lait progressivement en fouettant jusqu'à consistance lisse.</text>
        <text x="80" y="520" font-family="sans-serif" font-size="21" fill="#334155">3. Laisser reposer la pâte au frais pendant au moins une heure.</text>
      </svg>
    `,
  },
];

export const SamplePhotosPicker: React.FC<SamplePhotosPickerProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  const handleSelect = (renderSvg: () => string) => {
    const svgStr = renderSvg();
    const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    onSelectSample(encoded);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-white max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Fotos de prueba</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Si estás en un ordenador o no tienes un cartel a mano, prueba cómo la app detecta y traduce automáticamente diferentes idiomas:
        </p>

        <div className="mt-4 space-y-2.5 overflow-y-auto pr-1 flex-1">
          {SAMPLE_PREVIEWS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(sample.renderSvg)}
              className="w-full p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition flex items-center justify-between group active:scale-[0.99]"
            >
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-sky-300 transition">
                  {sample.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Idioma original: <span className="text-sky-400 font-medium">{sample.language}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition">
                Probar
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
