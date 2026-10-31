import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, ChevronDown } from "lucide-react";

export const HeroBanner = () => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Autoplay muted
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, []);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const scrollToCatalog = () => {
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero-section hero-banner-prominent" aria-label="Hero Video Showcase">
      <div className="container">
        <div className="hero-video-wrap">
          <video
            ref={videoRef}
            className="hero-video-player"
            poster="/images/poomani_showcase_poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onClick={scrollToCatalog}
            title="Poomani Chekku Ennai - Click to browse Coconut, Sesame, and Groundnut Oils"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src="/videos/poomani_showcase.webm" type="video/webm" />
            <source src="/videos/poomani_showcase.mp4" type="video/mp4" />
            <img
              src="/images/poomani_showcase_poster.jpg"
              alt="Poomani Chekku Ennai — பூமணி செக்கு எண்ணெய் | Pure. Natural. Traditional. 100% Pure & Unrefined Edible Cooking Oils (Coconut Oil, Sesame Oil, Groundnut Oil)"
              className="hero-full-banner-img"
            />
          </video>

          {/* Floating Controls Bar */}
          <div className="hero-video-controls" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="hero-video-btn-play"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              title={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              type="button"
              className="hero-video-btn-explore"
              onClick={scrollToCatalog}
              title="Browse our 3 pure oils: Coconut, Sesame, and Groundnut"
            >
              <span>Explore Oils / எண்ணெய் வகைகள்</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
