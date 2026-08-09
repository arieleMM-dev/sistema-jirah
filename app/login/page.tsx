'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'ACCOUNT_INACTIVE') {
          setError('Su cuenta se encuentra desactivada. Comuníquese con el administrador.');
        } else {
          setError('Correo o contraseña incorrectos');
        }
      } else {
        const res = await fetch('/api/perfil');
        const data = await res.json();

        if (data.user?.rol === 'ADMIN') {
          router.push('/dashboard');
        } else {
          router.push('/dashboard/campo/pesaje');
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex w-full bg-white dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100">
      
      {/* Columna Izquierda - Logo y Branding (Solo Desktop) */}
      <section className="hidden lg:flex w-1/2 bg-gray-50 dark:bg-gray-800 flex-col justify-center items-center p-12 border-r border-gray-200 dark:border-gray-700">
        <div className="max-w-[300px] w-full flex flex-col items-center">
          <img 
            src="/Logo.jpeg" 
            alt="Finca Jirah Logo" 
            className="w-full h-auto object-contain drop-shadow-xl"
          />
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-green-800 dark:text-green-400">
            Finca Jirah
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Sistema Integral de Trazabilidad Agrícola
          </p>
        </div>
      </section>

      {/* Columna Derecha - Formulario (Mobile & Desktop) */}
      <section className="flex flex-col w-full lg:w-1/2 items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md flex flex-col gap-8">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Iniciar Sesión</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="email">Correo electrónico</label>
              <input 
                id="email"
                type="email" 
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
                <a href="/recuperar" className="text-xs text-green-600 dark:text-green-400 hover:underline">¿Olvidaste tu contraseña?</a>
              </div>
              <input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="mt-4 min-h-[48px] rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-green-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
