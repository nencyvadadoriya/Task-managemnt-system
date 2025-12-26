import React, { useState, useEffect } from 'react';
import { X, Building, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Brand, BrandStatus } from '../Types/Types';

interface EditBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (brandId: string, brandData: any) => Promise<void>;
    brand: Brand;
    companies: string[];
}

const EditBrandModal: React.FC<EditBrandModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    brand,
    companies,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        description: '',
        category: '',
        status: 'active' as BrandStatus,
        logo: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [customCompany, setCustomCompany] = useState('');

    // Pre-fill form with brand data
    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name || '',
                company: brand.company || '',
                description: brand.description || '',
                category: brand.category || '',
                status: brand.status || 'active',
                logo: brand.logo || '',
            });
            setLogoPreview(brand.logo || '');
        }
    }, [brand]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                name: '',
                company: '',
                description: '',
                category: '',
                status: 'active',
                logo: '',
            });
            setLogoPreview('');
            setCustomCompany('');
            setErrors({});
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Handle company change
        if (name === 'company' && value === 'new') {
            setCustomCompany('');
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('Logo size should be less than 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setFormData(prev => ({ ...prev, logo: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        setLogoPreview('');
        setFormData(prev => ({ ...prev, logo: '' }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Brand name is required';
        }

        if (!formData.company || (formData.company === 'new' && !customCompany.trim())) {
            newErrors.company = 'Company is required';
        }

        if (!formData.category.trim()) {
            newErrors.category = 'Category is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const finalCompany = formData.company === 'new' ? customCompany : formData.company;
            
            const brandData = {
                ...formData,
                company: finalCompany,
                logo: formData.logo || undefined,
            };

            await onUpdate(String(brand.id), brandData);
            onClose();
        } catch (error) {
            console.error('Error updating brand:', error);
            toast.error('Failed to update brand');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Building className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">
                                    Edit Brand
                                </h3>
                                <p className="text-sm text-blue-100 mt-0.5">
                                    Update brand details
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-6 overflow-y-auto flex-1">
                        <div className="space-y-6">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-3">
                                    Brand Logo
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        {logoPreview ? (
                                            <>
                                                <img
                                                    src={logoPreview}
                                                    alt="Brand logo preview"
                                                    className="h-24 w-24 rounded-xl object-cover border-2 border-gray-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeLogo}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center">
                                                <Building className="h-8 w-8 text-gray-400" />
                                                <span className="text-xs text-gray-500 mt-2">No logo</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Logo
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                            />
                                        </label>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Recommended: 400x400px, PNG or JPG, max 5MB
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Brand Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Brand Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter brand name"
                                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Company *
                                </label>
                                <select
                                    name="company"
                                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.company ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    value={formData.company}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select a company</option>
                                    {companies.map(company => (
                                        <option key={company} value={company}>
                                            {company}
                                        </option>
                                    ))}
                                    <option value="new">+ Add New Company</option>
                                </select>
                                {formData.company === 'new' && (
                                    <div className="mt-3">
                                        <input
                                            type="text"
                                            placeholder="Enter new company name"
                                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={customCompany}
                                            onChange={(e) => setCustomCompany(e.target.value)}
                                        />
                                    </div>
                                )}
                                {errors.company && (
                                    <p className="mt-1 text-sm text-red-600">{errors.company}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.category ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    value={formData.category}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select a category</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Healthcare">Healthcare</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Retail">Retail</option>
                                    <option value="Manufacturing">Manufacturing</option>
                                    <option value="Service">Service</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.category && (
                                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Status
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['active', 'inactive', 'archived'] as BrandStatus[]).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => handleInputChange({
                                                target: { name: 'status', value: status }
                                            } as React.ChangeEvent<HTMLSelectElement>)}
                                            className={`py-2.5 text-xs font-medium rounded-lg border ${
                                                formData.status === status
                                                    ? status === 'active'
                                                        ? 'bg-green-100 text-green-700 border-green-300'
                                                        : status === 'inactive'
                                                        ? 'bg-gray-100 text-gray-700 border-gray-300'
                                                        : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                    : 'bg-gray-50 text-gray-600 border-gray-300'
                                            }`}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    placeholder="Describe the brand..."
                                    rows={4}
                                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Provide details about the brand, its products, and target audience.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${
                                    isSubmitting
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Update Brand
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBrandModal;