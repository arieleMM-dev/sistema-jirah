'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import styles from './auth.module.css';

function disposeModel(model: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

export default function PitahayaModel({ running, onReady, onUnavailable }: {
  running: boolean; onReady: (ready: boolean) => void; onUnavailable: (unavailable: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(running);
  const resumeRef = useRef<() => void>(() => {});
  useEffect(() => { runningRef.current = running; resumeRef.current(); }, [running]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { onUnavailable(true); return; }
    let disposed = false;
    let frame = 0;
    let model: THREE.Group | undefined;
    let previousTime = 0;
    let motionTime = 0;
    let lastRender = 0;
    const controller = new AbortController();
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3, 3, 2.5, -2.5, .1, 50);
    camera.position.set(0, .1, 8);
    camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .85;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.className = styles.modelCanvas;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.testid = 'pitahaya-canvas';
    host.appendChild(canvas);

    const environmentScene = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(environmentScene, .04);
    environmentScene.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = .25;
    scene.add(new THREE.HemisphereLight(0xfff8df, 0x344838, .55));
    const key = new THREE.DirectionalLight(0xffefd4, 2.5);
    key.position.set(-3, 4, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
    key.shadow.normalBias = .015;
    const fill = new THREE.DirectionalLight(0xe6efff, .45);
    fill.position.set(3, 1, 2);
    const rim = new THREE.DirectionalLight(0xffffff, 1.3);
    rim.position.set(2, 3, -4);
    scene.add(key, fill, rim);
    const tilt = new THREE.Group();
    tilt.rotation.z = -.18;
    scene.add(tilt);

    const draw = () => {
      if (disposed) return;
      renderer.render(scene, camera);
      if (model) host.dataset.rotation = model.rotation.y.toFixed(4);
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      const aspect = width / height;
      camera.left = -2.5 * aspect;
      camera.right = 2.5 * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animate = (time: number) => {
      frame = 0;
      if (disposed || !model || !runningRef.current) { previousTime = 0; return; }
      if (previousTime) motionTime += Math.min((time - previousTime) / 1000, .10);
      previousTime = time;
      model.rotation.y = .35 + motionTime * (Math.PI * 2 / 24);
      tilt.position.y = Math.sin(motionTime * Math.PI / 4) * .045;
      if (time - lastRender >= 1000 / 30) { draw(); lastRender = time; }
      frame = requestAnimationFrame(animate);
    };
    const resume = () => {
      host.dataset.motion = runningRef.current ? 'running' : 'paused';
      if (!runningRef.current && frame) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
      if (runningRef.current && model && !frame) frame = requestAnimationFrame(animate);
    };
    resumeRef.current = resume;
    const contextLost = (event: Event) => { event.preventDefault(); onUnavailable(true); };
    canvas.addEventListener('webglcontextlost', contextLost);

    void fetch('/brand/pitahaya-amarilla-20261014.glb', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Modelo no disponible'); return response.arrayBuffer(); })
      .then(data => new GLTFLoader().parseAsync(data, '/brand/'))
      .then(gltf => {
        if (disposed) { disposeModel(gltf.scene); return; }
        model = gltf.scene;
        model.position.y = .15;
        model.rotation.y = .35;
        model.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          if (!(object.material instanceof THREE.MeshStandardMaterial)) return;
          const original = object.material;
          if (original.name !== 'Yellow-pitahaya-skin') {
            original.metalness = 0;
            original.roughness = .95;
            original.vertexColors = true;
            return;
          }
          if (!original.map || !original.normalMap || !original.roughnessMap) throw new Error('Material del modelo no disponible');
          const material = new THREE.MeshPhysicalMaterial({ map: original.map, vertexColors: true,
            roughness: 1, roughnessMap: original.roughnessMap, normalMap: original.normalMap,
            normalScale: new THREE.Vector2(.20, .20), metalness: 0, clearcoat: .12, clearcoatRoughness: .50 });
          if (material.map) material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
          object.material = material;
          original.dispose();
        });
        tilt.add(model);
        draw();
        host.dataset.state = 'ready';
        onReady(true);
        resume();
      }).catch(() => { if (!disposed) onUnavailable(true); });

    return () => {
      disposed = true;
      controller.abort();
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      resumeRef.current = () => {};
      canvas.removeEventListener('webglcontextlost', contextLost);
      if (model) disposeModel(model);
      key.shadow.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      onReady(false);
    };
  }, [onReady, onUnavailable]);

  return <div ref={hostRef} className={styles.modelMount} data-testid="pitahaya-model" data-state="loading" aria-hidden="true" />;
}
