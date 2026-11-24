import type { APIRoute } from 'astro';
import { getAchievements } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const result = getAchievements();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to fetch achievements data',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
