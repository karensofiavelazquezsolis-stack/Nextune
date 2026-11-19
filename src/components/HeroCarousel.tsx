import React, { useState } from 'react';

interface Slide {
  id: number;
  badge: string;
  title: string;
  highlight: string;
  description: string;
  bgGradient: string;
}

const slides: Slide[] = [
  {
    id: 1,
    badge: 'SELECCIÓN NEXTTUNE',
    title: 'Tu mundo suena',
    highlight: 'mejor sin pausas.',
    description: 'Una mezcla creada para acompañar tu tarde con nuevos sonidos y tus favoritos de siempre.',
    bgGradient: 'from-amber-900/40 via-neutral-900 to-neutral-950',
  },
  {
    id: 2,
    badge: 'LO MÁS NUEVO',
    title: 'Descubre los',
    highlight: 'estrenos del día.',
    description: 'Actualiza tu biblioteca con los sencillos más sonados y artistas en tendencia.',
    bgGradient: 'from-orange-900/40 via-neutral-900 to-neutral-950',
  },
  {
    id: 3,
    badge: 'EXCLUSIVO',
    title: 'Tus vibras,',
    highlight: 'tu propio ritmo.',
    description: 'Explora listas personalizadas que se adaptan exactamente a lo que quieres escuchar ahora.',
    bgGradient: 'from-purple-900/40 via-neutral-900 to-neutral-950',
  },
];

export const HeroCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const current = slides[currentIndex];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl bg-neutral-900 border border-neutral-800 transition-all duration-500">
      {/* Contenido del Slide Actual */}
      <div className={`p-8 md:p-12 bg-gradient-to-r ${current.bgGradient} flex flex-col justify-between min-h-[280px]`}>
        <div>
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-orange-400 uppercase bg-orange-950/60 rounded-full border border-orange-800/50">
            {current.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {current.title} <span className="text-orange-500">{current.highlight}</span>
          </h2>
          <p className="mt-3 text-sm md:text-base text-neutral-300 max-w-xl">
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button className="flex items-center gap-2 px-6 py-3 font-semibold text-white bg-orange-600 rounded-full hover:bg-orange-500 transition-colors shadow-lg">
            <span>▶</span> Reproducir
          </button>

          {/* Controles de navegación */}
          <div className="flex items-center gap-2">
            <button 
              onClick={prevSlide}
              className="p-2 rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700 transition-colors"
              aria-label="Anterior"
            >
              ❮
            </button>
            <div className="flex gap-1.5 px-2">
              {slides.map((_, idx) => (
                <span 
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full cursor-pointer transition-all ${currentIndex === idx ? 'w-6 bg-orange-500' : 'w-2 bg-neutral-600'}`}
                />
              ))}
            </div>
            <button 
              onClick={nextSlide}
              className="p-2 rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700 transition-colors"
              aria-label="Siguiente"
            >
              ❯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};