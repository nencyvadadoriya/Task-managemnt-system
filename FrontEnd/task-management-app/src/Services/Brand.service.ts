// services/Brand.services.ts
import apiClient from './apiClient';
import type { Brand, CreateBrandDto, UpdateBrandDto } from '../Types/Types';

export const brandService = {
    // Get all brands with optional filtering
    async getBrands(params?: {
        search?: string;
        status?: string;
        company?: string;
    }): Promise<{ success: boolean; data: Brand[]; total: number }> {
        const response = await apiClient.get('/brands', { params });
        return response.data;
    },

    // Get single brand by ID
    async getBrandById(id: string): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.get(`/brands/${id}`);
        return response.data;
    },

    // Create new brand
    async createBrand(brandData: CreateBrandDto): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.post('/brands', brandData);
        return response.data;
    },

    // Update existing brand
    async updateBrand(id: string, brandData: UpdateBrandDto): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.put(`/brands/${id}`, brandData);
        return response.data;
    },

    // Delete brand
    async deleteBrand(id: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.delete(`/brands/${id}`);
        return response.data;
    },
};