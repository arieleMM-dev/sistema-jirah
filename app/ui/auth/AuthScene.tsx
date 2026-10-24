'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Component, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import styles from './auth.module.css';

const PitahayaModel = dynamic(() => import('./PitahayaModel'), { ssr: false });

class ModelBoundary extends Component<{ children: ReactNode; onUnavailable: (value: boolean) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(true); }
  render() { return this.state.failed ? null : this.props.children; }
}

const stories = [
  { title: 'El amarillo de la madurez.', text: 'Su corteza adquiere el amarillo característico cuando la fruta madura.' },
  { title: 'Un interior que sorprende.', text: 'Bajo la piel dorada, su pulpa es blanca y está salpicada de pequeñas semillas negras.' },
  { title: 'Dulce por naturaleza.', text: 'La pulpa combina un sabor dulce con una textura suculenta.' },
  { title: 'Un aroma delicado.', text: 'Su aroma acompaña la dulzura característica de la pitahaya amarilla.' },
  { title: 'De la familia de los cactus.', text: 'Crece en una planta trepadora de la familia de las cactáceas.' },
  { title: 'Florece al caer la noche.', text: 'Sus flores comienzan a abrirse al inicio de la noche.' },
];
const motionQuery = '(min-width: 800px) and (prefers-reduced-motion: no-preference)';
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function subscribeActivity(callback: () => void) {
  document.addEventListener('visibilitychange', callback);
  document.addEventListener('focusin', callback);
  document.addEventListener('focusout', callback);
  return () => {
    document.removeEventListener('visibilitychange', callback);
    document.removeEventListener('focusin', callback);
    document.removeEventListener('focusout', callback);
  };
}
function isPageIdle() {
  return !document.hidden && !document.activeElement?.closest('#acceso');
}

export default function AuthScene({ prototype3D = false }: { prototype3D?: boolean }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const sceneRef = useRef<HTMLElement>(null);
  const motionAllowed = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => false);
  const pageIdle = useSyncExternalStore(subscribeActivity, isPageIdle, () => false);
  const running = motionAllowed && pageIdle && inView && !hovered;

  useEffect(() => {
    const observer = new IntersectionObserver(entries => setInView(entries[0].isIntersecting));
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (!isPageIdle()) return;
      const offset = 1 + Math.floor(Math.random() * (stories.length - 1));
      setIndex(current => (current + offset) % stories.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <aside ref={sceneRef} className={styles.scene} data-scene-mode={prototype3D ? 'prototype-3d' : 'photo'} aria-label="Conoce la pitahaya amarilla" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <p className={styles.sceneTitle}>Nuestra esencia.<br /><span>Pitahaya amarilla.</span></p>
      <figure className={styles.fruitFigure}>
        <Image src="/brand/pitahaya-realista.webp" alt="" width={1024} height={1536} sizes="(min-width: 1200px) 540px, (min-width: 800px) 380px, 32px" className={styles.fruit} data-testid="pitahaya-photo" style={{ visibility: prototype3D && motionAllowed && modelReady && !modelUnavailable ? 'hidden' : 'visible', animationPlayState: running ? 'running' : 'paused' }} />
        {prototype3D && motionAllowed && !modelUnavailable && <ModelBoundary onUnavailable={setModelUnavailable}>
          <PitahayaModel running={running} onReady={setModelReady} onUnavailable={setModelUnavailable} />
        </ModelBoundary>}
        <figcaption className={styles.fruitCaption}>Selenicereus megalanthus</figcaption>
      </figure>
      <div className={styles.storyArea} aria-live="off" data-testid="pitahaya-facts">
        {stories.map((story, storyIndex) => (
          <div className={styles.story} key={story.title} data-active={storyIndex === index} aria-hidden={storyIndex !== index}>
            <p className={styles.storyTitle}>{story.title}</p>
            <p className={styles.storyText}>{story.text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
