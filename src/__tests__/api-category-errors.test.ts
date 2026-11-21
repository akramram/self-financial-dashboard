import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCategory, updateCategoryApi, deleteCategoryApi } from '../lib/api';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('category API helpers surface server errors', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('createCategory rejects on 409 duplicate with the server message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'Category already exists' }));
    await expect(createCategory({ name: 'Makan', color: '#000000', monthly_limit: 0 })).rejects.toThrow(
      'Tambah kategori gagal (409): Category already exists',
    );
  });

  it('createCategory returns the created row on 201', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 9, name: 'Baru' }));
    await expect(createCategory({ name: 'Baru', color: '#000000', monthly_limit: 0 })).resolves.toMatchObject({ id: 9 });
  });

  it('updateCategoryApi rejects on rename collision', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'Category name already exists' }));
    await expect(updateCategoryApi(3, { name: 'Makan' })).rejects.toThrow('Category name already exists');
  });

  it('deleteCategoryApi rejects on non-JSON 500', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(deleteCategoryApi(3)).rejects.toThrow('Hapus kategori gagal (500)');
  });
});
