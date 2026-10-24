import { useState, useEffect, useRef } from 'react';

export type Agricultor = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  rol: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export function usePersonal() {
  const [agricultores, setAgricultores] = useState<Agricultor[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Usamos AbortController para evitar memory leaks y race conditions en búsquedas rápidas
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Si hay una petición en curso, la cancelamos antes de lanzar una nueva
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Creamos un nuevo controlador para esta petición
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchAgricultores = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/agricultores?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        
        if (!res.ok) throw new Error('Error al cargar agricultores');
        
        const data = await res.json();
        setAgricultores(data.agricultores ?? []);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // Es esperado si el usuario tipeó rápido, ignorar silenciosamente
          return;
        }
        setError(err instanceof Error ? err.message : 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    // Debounce manual de 300ms
    const timer = setTimeout(() => {
      fetchAgricultores();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

  return {
    agricultores,
    query,
    setQuery,
    loading,
    error
  };
}
