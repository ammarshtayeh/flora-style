"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

type HeroCarouselProps = {
  alt: string;
  images: string[];
};

export function HeroCarousel({ images, alt }: HeroCarouselProps) {
  const slides = images.length ? images : ["/flora-hero-model.png"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides.join("|")]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [slides]);

  return (
    <div className="flora-hero-carousel">
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="flora-hero-carousel__slide"
          exit={{ opacity: 0, scale: 0.98 }}
          initial={{ opacity: 0, scale: 1.03 }}
          key={slides[index]}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            alt={alt}
            className="flora-home__hero-model"
            fill
            priority={index === 0}
            sizes="(max-width: 900px) 88vw, 44vw"
            src={slides[index]}
          />
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 ? (
        <div className="flora-hero-carousel__dots">
          {slides.map((slide, slideIndex) => (
            <button
              aria-label={`صورة ${slideIndex + 1}`}
              className={slideIndex === index ? "is-active" : undefined}
              key={`${slide}-${slideIndex}`}
              onClick={() => setIndex(slideIndex)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
