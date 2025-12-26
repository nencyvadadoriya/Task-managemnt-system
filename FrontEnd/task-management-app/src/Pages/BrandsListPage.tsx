import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building,
    Plus,
    Search,
    Grid,
    List,
    Users,
    Calendar,
    Activity,
    Eye,
    Package,
    X,
    Loader2,
    RefreshCw,
    Filter,
    Tag,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Edit,
    Trash2,
    MoreVertical,
    CalendarDays,
    CheckCircle,
    AlertCircle,
    Clock as ClockIcon,
    AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Brand, BrandStatus, Task, UserType } from '../Types/Types';
import { brandService } from '../Services/Brand.service';
import { taskService } from '../Services/Task.services';

interface BrandsListPageProps {
    isSidebarCollapsed?: boolean;
    onSelectBrand?: (brandId: string) => void;
    currentUser?: UserType;
}

interface FilterState {
    status: BrandStatus | 'all';
    company: string;
    category: string;
    search: string;
    brand: string;
}

interface BrandStats {
    totalBrands: number;
    activeBrands: number;
    totalTasks: number;
    averageTasksPerBrand: number;
}

type TaskDisplayType = 'all' | 'total-brands' | 'active-brands' | 'total-tasks' | null;

const BrandsListPage: React.FC<BrandsListPageProps> = ({
    isSidebarCollapsed = false,
    onSelectBrand,
    currentUser,
}) => {
    const navigate = useNavigate();
    const isAdminOrManager = (currentUser?.role || '').toLowerCase() === 'admin' || (currentUser?.role || '').toLowerCase() === 'manager';

    const [apiBrands, setApiBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [, setShowCreateModal] = useState(false);
    const [, setShowEditModal] = useState(false);
    const [, setSelectedBrand] = useState<Brand | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [taskDisplayType, setTaskDisplayType] = useState<TaskDisplayType>(null);

    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        company: 'all',
        category: 'all',
        search: '',
        brand: 'all',
    });

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [stats, setStats] = useState<BrandStats>({
        totalBrands: 0,
        activeBrands: 0,
        totalTasks: 0,
        averageTasksPerBrand: 0,
    });

    const brands = useMemo(() => {
        return [...apiBrands];
    }, [apiBrands]);

    // Get active filter count
    const getActiveFilterCount = useCallback(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.company !== 'all') count++;
        if (filters.category !== 'all') count++;
        if (filters.brand !== 'all') count++;
        if (filters.search) count++;
        return count;
    }, [filters]);

    // Fetch brands from backend
    const fetchBrands = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await brandService.getBrands();
            if (response && response.data) {
                // Sort brands by creation date (newest first) to show newly added brands at the top
                const sortedBrands = response.data.sort((a: Brand, b: Brand) => {
                    const dateA = new Date(a.createdAt || a.id || 0);
                    const dateB = new Date(b.createdAt || b.id || 0);
                    return dateB.getTime() - dateA.getTime();
                });
                setApiBrands(sortedBrands);
            } else {
                setApiBrands([]);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
            toast.error('Failed to load brands');
            setApiBrands([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Fetch tasks for counts
    const fetchTasks = useCallback(async () => {
        try {
            const res = await taskService.getAllTasks();
            setAllTasks(res.data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }, []);

    // Calculate statistics based on filtered brands
    const calculateStats = useCallback(() => {
        const totalBrands = brands.length;
        const activeBrands = brands.filter(brand => brand.status === 'active').length;
        const totalTasks = allTasks.length;
        const averageTasksPerBrand = totalBrands > 0 ? totalTasks / totalBrands : 0;

        setStats({
            totalBrands,
            activeBrands,
            totalTasks,
            averageTasksPerBrand: Number(averageTasksPerBrand.toFixed(1)),
        });
    }, [brands, allTasks]);

    // Initial data loading
    useEffect(() => {
        fetchBrands();
        fetchTasks();
    }, [fetchBrands, fetchTasks]);

    // Listen for brand updates from other components
    useEffect(() => {
        const handleBrandUpdate = () => {
            fetchBrands();
            fetchTasks();
        };

        window.addEventListener('brandUpdated', handleBrandUpdate);

        return () => {
            window.removeEventListener('brandUpdated', handleBrandUpdate);
        };
    }, [fetchBrands, fetchTasks]);

    // Auto-refresh brands every 30 seconds to catch any updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchBrands();
            fetchTasks();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [fetchBrands, fetchTasks]);

    // Calculate stats when brands or tasks change
    useEffect(() => {
        calculateStats();
    }, [calculateStats]);

    // Refresh function
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchBrands();
        fetchTasks();
    }, [fetchBrands, fetchTasks]);

    // Handle brand deletion
    const handleDeleteBrand = useCallback(async (brandId: string | number) => {
        if (!isAdminOrManager) {
            toast.error('Access denied');
            return;
        }
        const brandIdStr = String(brandId);
        if (!window.confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await brandService.deleteBrand(brandIdStr);
            if (response && response.success) {
                setApiBrands(prev => prev.filter(brand => String(brand.id) !== brandIdStr));
                setOpenMenuId(null);
                toast.success('Brand deleted successfully!');
                
                // Trigger update event
                window.dispatchEvent(new Event('brandUpdated'));
            }
        } catch (error) {
            console.error('Error deleting brand:', error);
            toast.error('Failed to delete brand');
        }
    }, [isAdminOrManager]);

    // Extract unique companies from brands
    const companies = useMemo(() => {
        const uniqueCompanies = [...new Set(brands.map(brand => brand.company))];
        return uniqueCompanies.filter(Boolean).sort();
    }, [brands]);

    // Extract unique categories from brands
    const categories = useMemo(() => {
        const uniqueCategories = [...new Set(brands.map(brand => brand.category))];
        return uniqueCategories.filter(Boolean).sort();
    }, [brands]);

    // Calculate task counts for each brand - FIXED VERSION
    const brandTaskCounts = useMemo(() => {
        const counts = new Map<string, number>();

        brands.forEach(brand => {
            // Try multiple matching strategies
            const count = allTasks.filter(task => {
                // Strategy 1: Match by brandId (exact match)
                if (task.brandId && String(task.brandId) === String(brand.id)) {
                    return true;
                }

                // Strategy 2: Match by brand name and company (case-insensitive)
                const taskBrand = typeof task.brand === 'string' ? task.brand : (task.brand as any)?.name;
                const taskCompany = task.companyName || (task as any)?.company || '';
                
                if (taskBrand && taskCompany) {
                    const brandMatch = taskBrand.toLowerCase().trim() === brand.name.toLowerCase().trim();
                    const companyMatch = taskCompany.toLowerCase().trim() === brand.company.toLowerCase().trim();
                    
                    if (brandMatch && companyMatch) {
                        return true;
                    }
                }

                // Strategy 3: Partial matching for brand name
                if (taskBrand && brand.name) {
                    const brandNameWords = brand.name.toLowerCase().split(' ');
                    const taskBrandWords = taskBrand.toLowerCase().split(' ');
                    
                    // Check if any word matches
                    const hasCommonWord = brandNameWords.some(word => 
                        taskBrandWords.includes(word) && word.length > 2
                    );
                    
                    if (hasCommonWord && taskCompany.toLowerCase().includes(brand.company.toLowerCase())) {
                        return true;
                    }
                }

                return false;
            }).length;

            counts.set(String(brand.id), count);
        });

        return counts;
    }, [brands, allTasks]);

    // Get filtered brands function
    const getFilteredBrands = useCallback(() => {
        return brands.filter(brand => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesName = brand.name?.toLowerCase().includes(searchLower);
                const matchesDescription = brand.description?.toLowerCase().includes(searchLower);
                const matchesCompany = brand.company?.toLowerCase().includes(searchLower);
                if (!matchesName && !matchesDescription && !matchesCompany) {
                    return false;
                }
            }

            // Status filter
            if (filters.status !== 'all' && brand.status !== filters.status) {
                return false;
            }

            // Company filter
            if (filters.company !== 'all' && brand.company !== filters.company) {
                return false;
            }

            // Category filter
            if (filters.category !== 'all' && brand.category !== filters.category) {
                return false;
            }

            // Brand filter
            if (filters.brand !== 'all' && brand.name !== filters.brand) {
                return false;
            }

            return true;
        });
    }, [brands, filters]);

    // Get tasks based on display type - IMPROVED VERSION
    const getDisplayedTasks = useCallback(() => {
        const filteredBrandsList = getFilteredBrands();
        const activeFilterCount = getActiveFilterCount();
        
        switch (taskDisplayType) {
            case 'total-brands':
                // Show tasks for filtered brands
                return allTasks.filter(task => {
                    return filteredBrandsList.some(brand => {
                        // Check if task belongs to this brand
                        const taskBrand = typeof task.brand === 'string' ? task.brand : (task.brand as any)?.name;
                        const taskCompany = task.companyName || (task as any)?.company || '';
                        
                        // Check multiple matching criteria
                        if (task.brandId && String(task.brandId) === String(brand.id)) {
                            return true;
                        }
                        
                        if (taskBrand && taskCompany) {
                            const brandMatch = taskBrand.toLowerCase() === brand.name.toLowerCase();
                            const companyMatch = taskCompany.toLowerCase() === brand.company.toLowerCase();
                            
                            if (brandMatch && companyMatch) {
                                return true;
                            }
                        }
                        
                        return false;
                    });
                });

            case 'active-brands':
                // Show tasks only for active brands
                const activeBrandsList = filteredBrandsList.filter(brand => brand.status === 'active');
                return allTasks.filter(task => {
                    return activeBrandsList.some(brand => {
                        const taskBrand = typeof task.brand === 'string' ? task.brand : (task.brand as any)?.name;
                        const taskCompany = task.companyName || (task as any)?.company || '';
                        
                        if (task.brandId && String(task.brandId) === String(brand.id)) {
                            return true;
                        }
                        
                        if (taskBrand && taskCompany) {
                            return taskBrand.toLowerCase() === brand.name.toLowerCase() &&
                                   taskCompany.toLowerCase() === brand.company.toLowerCase();
                        }
                        
                        return false;
                    });
                });

            case 'total-tasks':
                // Show all tasks
                return allTasks;

            default:
                // Show tasks based on current filters
                if (activeFilterCount > 0 || filters.search) {
                    return allTasks.filter(task => {
                        // Apply company filter
                        if (filters.company !== 'all') {
                            const taskCompany = (task.companyName || (task as any)?.company || '').toLowerCase();
                            if (taskCompany !== filters.company.toLowerCase()) {
                                return false;
                            }
                        }
                        
                        // Apply brand filter
                        if (filters.brand !== 'all') {
                            const taskBrand = typeof task.brand === 'string' 
                                ? task.brand.toLowerCase() 
                                : (task.brand as any)?.name?.toLowerCase() || '';
                            if (taskBrand !== filters.brand.toLowerCase()) {
                                return false;
                            }
                        }
                        
                        // Apply search filter
                        if (filters.search) {
                            const searchLower = filters.search.toLowerCase();
                            const matchesTitle = task.title.toLowerCase().includes(searchLower);
                            const matchesDesc = (task.description || '').toLowerCase().includes(searchLower);
                            const matchesBrand = typeof task.brand === 'string' 
                                ? task.brand.toLowerCase().includes(searchLower)
                                : (task.brand as any)?.name?.toLowerCase().includes(searchLower) || false;
                            
                            if (!matchesTitle && !matchesDesc && !matchesBrand) {
                                return false;
                            }
                        }
                        
                        return true;
                    });
                }
                return [];
        }
    }, [allTasks, taskDisplayType, getFilteredBrands, getActiveFilterCount, filters]);

    // Reset all filters
    const resetFilters = useCallback(() => {
        setFilters({
            status: 'all',
            company: 'all',
            category: 'all',
            search: '',
            brand: 'all',
        });
        setTaskDisplayType(null);
    }, []);

    // Extract unique brands for filtering based on selected company
    const availableBrandsForFilter = useMemo(() => {
        let list = brands;
        if (filters.company !== 'all') {
            list = brands.filter(b => b.company === filters.company);
        }
        return [...new Set(list.map(b => b.name))].filter(Boolean).sort();
    }, [brands, filters.company]);

    // Helper function to check if brand is newly added (within last 5 minutes)
    const isNewBrand = useCallback((brand: Brand) => {
        if (!brand.createdAt) return false;
        try {
            const createdTime = new Date(brand.createdAt).getTime();
            const now = new Date().getTime();
            const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes in milliseconds
            return createdTime > fiveMinutesAgo;
        } catch (error) {
            return false;
        }
    }, []);

    // Format date for task display
    const formatDate = (date: string | Date | undefined) => {
        if (!date) return 'No date';
        try {
            return new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    // Helper functions for task UI
    const getTaskStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case 'in-progress':
                return <ClockIcon className="h-4 w-4 text-blue-500" />;
            case 'pending':
                return <AlertCircle className="h-4 w-4 text-amber-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTaskStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'in-progress': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    const getTaskPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-blue-50 text-blue-700 border-blue-100';
        }
    };

    const getTaskPriorityIcon = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high':
                return <AlertTriangle className="h-4 w-4 text-rose-500" />;
            case 'medium':
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-blue-500" />;
        }
    };

    // Status styling functions
    const getStatusColor = useCallback((status: BrandStatus) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'archived':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }, []);

    const getStatusIcon = useCallback((status: BrandStatus) => {
        switch (status) {
            case 'active':
                return <Activity className="h-4 w-4" />;
            case 'inactive':
                return <Calendar className="h-4 w-4" />;
            case 'archived':
                return <Package className="h-4 w-4" />;
            default:
                return <Building className="h-4 w-4" />;
        }
    }, []);

    // Handle brand click - FIXED VERSION
    const handleBrandClick = useCallback((brandId: string) => {
        if (onSelectBrand) {
            onSelectBrand(brandId);
            return;
        }
        navigate(`/brands/${brandId}`);
    }, [navigate, onSelectBrand]);

    // Handle edit click
    const handleEditClick = useCallback((brand: Brand, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedBrand(brand);
        setShowEditModal(true);
        setOpenMenuId(null);
    }, []);

    // Handle filter changes
    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        // Reset task display when filters change
        setTaskDisplayType(null);
    }, []);

    // Handle stats card click
    const handleStatsCardClick = useCallback((type: TaskDisplayType) => {
        if (taskDisplayType === type) {
            // If clicking the same card again, hide tasks
            setTaskDisplayType(null);
        } else {
            // Show tasks for this stat type
            setTaskDisplayType(type);
        }
    }, [taskDisplayType]);

    // Get display title for tasks section
    const getTaskDisplayTitle = useCallback(() => {
        const activeFilterCount = getActiveFilterCount();
        
        switch (taskDisplayType) {
            case 'total-brands':
                return `Tasks for ${activeFilterCount > 0 || filters.search ? 'Filtered' : 'All'} Brands`;
            case 'active-brands':
                return 'Tasks for Active Brands';
            case 'total-tasks':
                return 'All Tasks';
            default:
                if (activeFilterCount > 0 || filters.search) {
                    return 'Filtered Tasks';
                }
                return 'Related Tasks';
        }
    }, [taskDisplayType, getActiveFilterCount, filters.search]);

    // Get displayed tasks
    const displayedTasks = getDisplayedTasks();

    // Container classes
    const containerClasses = useMemo(() => {
        return `
            w-full max-w-full mx-auto px-4 sm:px-6 md:px-8
            transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'lg:px-6' : 'lg:px-8'}
        `;
    }, [isSidebarCollapsed]);

    // Get filtered brands
    const filteredBrands = getFilteredBrands();

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading brands...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow border-b">
                <div className={containerClasses}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Building className="h-8 w-8 text-blue-600" />
                                <h1 className="text-3xl font-bold text-gray-900">Brands</h1>
                            </div>
                            <p className="text-gray-600">Manage and track all your brands in one place</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                                title="Refresh"
                            >
                                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                            {isAdminOrManager && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 shadow-sm"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Brand
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards - Clickable */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div 
                            onClick={() => handleStatsCardClick('total-brands')}
                            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                taskDisplayType === 'total-brands' 
                                    ? 'border-blue-500 ring-2 ring-blue-100' 
                                    : 'border-gray-200 hover:border-blue-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Brands</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {getActiveFilterCount() > 0 || filters.search ? filteredBrands.length : stats.totalBrands}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${
                                    taskDisplayType === 'total-brands' 
                                        ? 'bg-blue-100' 
                                        : 'bg-blue-50'
                                }`}>
                                    <Building className={`h-6 w-6 ${
                                        taskDisplayType === 'total-brands' 
                                            ? 'text-blue-600' 
                                            : 'text-blue-500'
                                    }`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-3">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-gray-500">+12% from last month</span>
                            </div>
                        </div>

                        <div 
                            onClick={() => handleStatsCardClick('active-brands')}
                            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                taskDisplayType === 'active-brands' 
                                    ? 'border-green-500 ring-2 ring-green-100' 
                                    : 'border-gray-200 hover:border-green-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Brands</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {getActiveFilterCount() > 0 || filters.search 
                                            ? filteredBrands.filter(brand => brand.status === 'active').length 
                                            : stats.activeBrands}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${
                                    taskDisplayType === 'active-brands' 
                                        ? 'bg-green-100' 
                                        : 'bg-green-50'
                                }`}>
                                    <Activity className={`h-6 w-6 ${
                                        taskDisplayType === 'active-brands' 
                                            ? 'text-green-600' 
                                            : 'text-green-500'
                                    }`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-3">
                                <span className="text-xs text-gray-500">
                                    {getActiveFilterCount() > 0 || filters.search
                                        ? `${Math.round((filteredBrands.filter(b => b.status === 'active').length / Math.max(filteredBrands.length, 1)) * 100)}% of filtered`
                                        : `${Math.round((stats.activeBrands / Math.max(stats.totalBrands, 1)) * 100)}% of total`
                                    }
                                </span>
                            </div>
                        </div>

                        <div 
                            onClick={() => handleStatsCardClick('total-tasks')}
                            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                taskDisplayType === 'total-tasks' 
                                    ? 'border-purple-500 ring-2 ring-purple-100' 
                                    : 'border-gray-200 hover:border-purple-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {displayedTasks.length > 0 && taskDisplayType === 'total-tasks'
                                            ? displayedTasks.length
                                            : stats.totalTasks
                                        }
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${
                                    taskDisplayType === 'total-tasks' 
                                        ? 'bg-purple-100' 
                                        : 'bg-purple-50'
                                }`}>
                                    <BarChart3 className={`h-6 w-6 ${
                                        taskDisplayType === 'total-tasks' 
                                            ? 'text-purple-600' 
                                            : 'text-purple-500'
                                    }`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-3">
                                <TrendingDown className="h-4 w-4 text-red-500" />
                                <span className="text-xs text-gray-500">-5% from last week</span>
                            </div>
                        </div>
                    </div>

                    {/* Filters Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                            >
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                                {getActiveFilterCount() > 0 && (
                                    <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                        {getActiveFilterCount()}
                                    </span>
                                )}
                            </button>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search brands..."
                                    value={filters.search}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, search: e.target.value }));
                                        setTaskDisplayType(null);
                                    }}
                                    className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            {(taskDisplayType || displayedTasks.length > 0) && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                                    <span className="text-sm font-medium">
                                        {displayedTasks.length} tasks shown
                                    </span>
                                    <button
                                        onClick={() => setTaskDisplayType(null)}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-500">
                                Showing {filteredBrands.length} of {brands.length} brands
                            </div>
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'grid'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    title="Grid View"
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'list'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    title="List View"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Filter className="h-5 w-5 text-gray-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={resetFilters}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Clear all
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                        Status
                                    </label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>

                                {/* Company Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                        Company
                                    </label>
                                    <select
                                        value={filters.company}
                                        onChange={(e) => handleFilterChange('company', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Companies</option>
                                        {companies.map(company => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Brand Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                        Brand
                                    </label>
                                    <select
                                        value={filters.brand}
                                        onChange={(e) => handleFilterChange('brand', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Brands</option>
                                        {availableBrandsForFilter.map(brandName => (
                                            <option key={brandName} value={brandName}>
                                                {brandName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Brands Content */}
            <div className={containerClasses}>
                <div className="py-6">
                    {/* Tasks Section - Show when stat card is clicked or filters applied */}
                    {(taskDisplayType || displayedTasks.length > 0) && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{getTaskDisplayTitle()}</h2>
                                    <p className="text-gray-600 text-sm mt-1">
                                        {displayedTasks.length} tasks found
                                        {taskDisplayType === 'total-brands' && getActiveFilterCount() > 0 && ' for filtered brands'}
                                        {taskDisplayType === 'active-brands' && ' for active brands'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setTaskDisplayType(null)}
                                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                    >
                                        <X className="h-4 w-4" />
                                        Hide tasks
                                    </button>
                                </div>
                            </div>
                            
                            {displayedTasks.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                    <div className="max-w-md mx-auto">
                                        <div className="p-4 bg-gray-100 rounded-2xl inline-flex mb-4">
                                            <BarChart3 className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            No tasks found
                                        </h3>
                                        <p className="text-gray-500">
                                            {taskDisplayType === 'active-brands'
                                                ? 'No tasks found for active brands'
                                                : 'Try adjusting your filters or select a different stat card'
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {displayedTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                                                        {task.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                                        <Building className="h-3 w-3" />
                                                        <span>{task.companyName || 'No company'}</span>
                                                        <span>•</span>
                                                        <span>{typeof task.brand === 'string' ? task.brand : (task.brand as any)?.name || 'No brand'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                                        {getTaskStatusIcon(task.status)}
                                                    </div>
                                                    {task.priority && (
                                                        <div className={`px-2 py-1 rounded text-xs font-medium ${getTaskPriorityColor(task.priority)}`}>
                                                            {getTaskPriorityIcon(task.priority)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                {task.description || 'No description available'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="h-3 w-3" />
                                                    <span>
                                                        Due: {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    <span>
                                                        {(typeof task.assignedTo === 'string'
                                                            ? (task.assignedToName || task.assignedTo)
                                                            : (task.assignedTo?.name || task.assignedToName)
                                                        ) || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Brands Section */}
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            {getActiveFilterCount() > 0 || filters.search ? 'Filtered Brands' : 'All Brands'}
                        </h2>
                    </div>

                    {filteredBrands.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="p-4 bg-gray-100 rounded-2xl inline-flex mb-4">
                                    <Building className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    No brands found
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {getActiveFilterCount() > 0 || filters.search
                                        ? 'Try adjusting your filters or search term'
                                        : 'No brands available. Create your first brand to get started.'
                                    }
                                </p>
                                {isAdminOrManager && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 shadow-sm"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Brand
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        // Grid View
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBrands.map((brand) => {
                                const taskCount = brandTaskCounts.get(String(brand.id)) || 0;
                                
                                return (
                                    <div
                                        key={brand.id}
                                        className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer relative"
                                        onClick={() => handleBrandClick(String(brand.id))}
                                    >
                                        {/* Company Badge */}
                                        <div className="absolute top-4 right-4">
                                            <div className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                                {brand.company}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                {brand.logo ? (
                                                    <img
                                                        src={brand.logo}
                                                        alt={brand.name}
                                                        className="h-14 w-14 rounded-xl object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="h-14 w-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                                        <Building className="h-7 w-7 text-white" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                            {brand.name}
                                                        </h3>
                                                        {isNewBrand(brand) && (
                                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">
                                                                NEW
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                        {brand.description || 'No description available'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const brandIdStr = String(brand.id);
                                                    setOpenMenuId(openMenuId === brandIdStr ? null : brandIdStr);
                                                }}
                                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(brand.status)}`}>
                                                {getStatusIcon(brand.status)}
                                                <span className="ml-1.5 capitalize">{brand.status}</span>
                                            </div>
                                        </div>

                                        {/* SIMPLIFIED Stats Section - Only show task count */}
                                        <div className="space-y-3 mb-5">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-2">
                                                    <BarChart3 className="h-4 w-4" />
                                                    Total Tasks
                                                </span>
                                                <span className="font-semibold text-gray-900">
                                                    {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBrandClick(String(brand.id));
                                                }}
                                                className="flex-1 px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Eye className="h-4 w-4" />
                                                View Details
                                            </button>
                                            {isAdminOrManager && (
                                                <button
                                                    onClick={(e) => handleEditClick(brand, e)}
                                                    className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown Menu */}
                                        {openMenuId === String(brand.id) && isAdminOrManager && (
                                            <div className="absolute right-6 top-14 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(brand, e);
                                                    }}
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    Edit Brand
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteBrand(brand.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete Brand
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // List View - SIMPLIFIED
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Brand Details
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Company
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tasks
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredBrands.map((brand) => {
                                            const taskCount = brandTaskCounts.get(String(brand.id)) || 0;
                                            
                                            return (
                                                <tr
                                                    key={brand.id}
                                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => handleBrandClick(String(brand.id))}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            {brand.logo ? (
                                                                <img
                                                                    src={brand.logo}
                                                                    alt={brand.name}
                                                                    className="h-10 w-10 rounded-lg object-cover mr-3"
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                                                    <Building className="h-5 w-5 text-white" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-gray-900">
                                                                        {brand.name}
                                                                    </span>
                                                                    {isNewBrand(brand) && (
                                                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">
                                                                            NEW
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                                                    {brand.description || 'No description available'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{brand.company}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(brand.status)}`}>
                                                            {getStatusIcon(brand.status)}
                                                            <span className="ml-1.5 capitalize">{brand.status}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {taskCount}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {taskCount === 1 ? 'task' : 'tasks'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleBrandClick(String(brand.id))}
                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                                View
                                                            </button>
                                                            {isAdminOrManager && (
                                                                <button
                                                                    onClick={(e) => handleEditClick(brand, e)}
                                                                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default BrandsListPage;