import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Sparkles, ChevronDown, CheckCircle2 } from "lucide-react";

export const HeroBanner = () => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showCenterPlayHint, setShowCenterPlayHint] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure autoplay triggers smoothly
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay blocked by browser policy without user gesture
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
      setShowCenterPlayHint(false);
    } else {
      video.pause();
      setIsPlaying(false);
      setShowCenterPlayHint(true);
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const scrollToCatalog = () => {
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero-section hero-banner-prominent" aria-label="Promotional Showcase Section">
      <div className="container">
        <div className="hero-video-card">
          {/* Main Video Frame */}
          <div
            className="hero-video-wrapper"
            onClick={togglePlay}
            role="region"
            aria-label="Poomani Chekku Ennai animated promotional showcase"
          >
            <video
              ref={videoRef}
              className="hero-video-player"
              poster="/images/poomani_promo_poster.jpg"
              autoPlay
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              onPlay={() => {
                setIsPlaying(true);
                setShowCenterPlayHint(false);
              }}
              onPause={() => {
                setIsPlaying(false);
                setShowCenterPlayHint(true);
              }}
            >
              <source src="/videos/poomani_promo.webm" type="video/webm" />
              <source src="/videos/poomani_promo.mp4" type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>

            {/* Top Badges Overlay */}
            <div className="hero-video-top-bar" onClick={(e) => e.stopPropagation()}>
              <div className="hero-video-brand-badge">
                <Sparkles size={14} className="gold-sparkle-icon" />
                <span>பூமணி செக்கு எண்ணெய் • 100% Traditional Cold-Pressed</span>
              </div>
              <div className="hero-video-fssai-badge">
                <CheckCircle2 size={13} className="text-gold" />
                <span>FSSAI #12421008000421</span>
              </div>
            </div>

            {/* Center Pause/Play Floating Overlay */}
            {!isPlaying && (
              <div
                className="hero-video-center-overlay"
                onClick={togglePlay}
                role="button"
                tabIndex={0}
                aria-label="Play promotional video"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") togglePlay(e);
                }}
              >
                <div className="hero-video-play-circle">
                  <Play size={36} fill="#ffffff" color="#ffffff" className="play-icon-offset" />
                </div>
                <span className="hero-video-center-text">Click to Play Video / வீடியோ பார்க்க</span>
              </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="hero-video-bottom-bar" onClick={(e) => e.stopPropagation()}>
              <div className="hero-video-controls-left">
                <button
                  type="button"
                  className="video-ctrl-btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause Video" : "Play Video"}
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                  <span className="ctrl-btn-label">{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  className="video-ctrl-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  <span className="ctrl-btn-label">{isMuted ? "Muted" : "Sound"}</span>
                </button>

                <span className="hero-video-tag-pill d-none-mobile">
                  ✨ Coconut • Sesame • Groundnut Oils
                </span>
              </div>

              <div className="hero-video-controls-right">
                <button
                  type="button"
                  className="hero-video-cta-btn"
                  onClick={scrollToCatalog}
                  title="Scroll to view all 3 oils and bottle sizes"
                >
                  <span>Explore Pure Oils / எண்ணெய் வகைகள்</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
