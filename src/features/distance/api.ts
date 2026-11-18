import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type LocationRow = Database['public']['Tables']['locations']['Row'];

/** Última ubicación de cada quien en la pareja (RLS: solo miembros actuales). */
export async function fetchLocations(coupleId: string): Promise<LocationRow[]> {
  const { data, error } = await supabase.from('locations').select('*').eq('couple_id', coupleId);
  if (error) throw error;
  return data;
}

/** Guarda mi ubicación (el servidor la redondea a ~11 m y avisa a los widgets si me moví). */
export async function setMyLocation(input: {
  lat: number;
  lng: number;
  city?: string | null;
  /** Precisión de la lectura en metros. */
  accuracy?: number | null;
}): Promise<LocationRow> {
  const { data, error } = await supabase.rpc('set_my_location', {
    p_lat: input.lat,
    p_lng: input.lng,
    p_city: input.city ?? undefined,
    p_accuracy: input.accuracy ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Dejar de compartir = borrar mi fila. */
export async function clearMyLocation(): Promise<void> {
  const { error } = await supabase.rpc('clear_my_location');
  if (error) throw error;
}
