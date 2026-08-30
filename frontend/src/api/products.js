import { apiClient } from './client';

export async function getProducts({ category, search, region, material, min_price, max_price, limit = 40, offset = 0 } = {}) {
  let url = '/products';
  const params = new URLSearchParams();
  if (category && category !== 'All' && category !== 'all') params.append('category', category);
  if (search) params.append('search', search);
  if (region && region !== 'All' && region !== 'all') params.append('region', region);
  if (material && material !== 'All' && material !== 'all') params.append('material', material);
  if (min_price) params.append('min_price', min_price);
  if (max_price) params.append('max_price', max_price);
  params.append('limit', limit);
  params.append('offset', offset);

  const qs = params.toString();
  if (qs) url += `?${qs}`;
  return apiClient(url);
}

export async function createProduct(productData) {
  return apiClient('/products', {
    body: productData
  });
}

export async function enhanceImage(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  return apiClient('/enhance', {
    body: formData
  });
}

export async function generateCatalog({ audioFile, textDesc, lang = 'Hindi' }) {
  const formData = new FormData();
  if (audioFile) formData.append('audio', audioFile);
  if (textDesc) formData.append('text_desc', textDesc);
  formData.append('lang', lang);

  return apiClient('/catalog', {
    body: formData
  });
}

export async function suggestPrice({ category, material_cost, manufacturing_hours, product_description }) {
  return apiClient('/suggest-price', {
    body: {
      category,
      material_cost: parseFloat(material_cost) || 0,
      manufacturing_hours: parseFloat(manufacturing_hours) || 0,
      product_description: product_description || ''
    }
  });
}

