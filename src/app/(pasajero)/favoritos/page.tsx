'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedireccionFavoritos() {
  const router = useRouter();
  useEffect(() => { router.replace('/pasajero/perfil'); }, [router]);
  return null;
}
