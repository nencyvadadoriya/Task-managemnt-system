import React from 'react';
import { X, Filter, RefreshCcw } from 'lucide-react';

interface AdvancedFiltersProps {
    filters: {
        status: string;
        priority: string;
        assigned: string;
        date: string;
        taskType: string;
        company: string;
        brand: string;
    };
    availableCompanies: string[];
    availableTaskTypes: string[];
    availableBrands: string[];
    users?: Array<{ id: string; name: string; email: string }>;
    currentUser?: { email: string; role: string };
    onFilterChange: (filterType: string, value: string) => void;
    onResetFilters: () => void;
    showFilters: boolean;
    onToggleFilters: () => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
    filters,
    availableCompanies,
    availableTaskTypes,
    availableBrands,
    onFilterChange,
    onResetFilters,
    showFilters,
    onToggleFilters,
}) => {
    if (!showFilters) return null;

    // Calculate active filter count
    const getActiveFilterCount = () => {
        let count = 0;
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== 'all' && key !== 'brand') {
                count++;
            }
        });
        return count;
    };

    const activeFilterCount = getActiveFilterCount();

    return (
        <div className="mt-4 mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                    {activeFilterCount > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onResetFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Clear all
                    </button>
                    <button
                        onClick={onToggleFilters}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                {/* Status Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Status
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                {/* Priority Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Priority
                    </label>
                    <select
                        value={filters.priority}
                        onChange={(e) => onFilterChange('priority', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                {/* Assigned Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Assigned
                    </label>
                    <select
                        value={filters.assigned}
                        onChange={(e) => onFilterChange('assigned', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Everyone</option>
                        <option value="assigned-to-me">Assigned To Me</option>
                        <option value="assigned-by-me">Assigned By Me</option>
                    </select>
                </div>

                {/* Due Date Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Due Date
                    </label>
                    <select
                        value={filters.date}
                        onChange={(e) => onFilterChange('date', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>

                {/* Task Type Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Type
                    </label>
                    <select
                        value={filters.taskType}
                        onChange={(e) => onFilterChange('taskType', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Types</option>
                        {availableTaskTypes.map((typeName) => (
                            <option key={typeName} value={typeName}>
                                {typeName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Company Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Company
                    </label>
                    <select
                        value={filters.company}
                        onChange={(e) => onFilterChange('company', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Companies</option>
                        {availableCompanies.map(company => (
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
                        onChange={(e) => onFilterChange('brand', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={filters.company === 'all'}
                    >
                        <option value="all">
                            {filters.company === 'all' ? 'Select company first' : `All ${filters.company} Brands`}
                        </option>
                        {availableBrands.map(brand => (
                            <option key={brand} value={brand}>
                                {brand}
                            </option>
                        ))}
                    </select>
                    {filters.company === 'all' && (
                        <p className="mt-1 text-xs text-gray-500"> 
                            Select a company to filter brands
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button
                    onClick={onResetFilters}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
};

export default AdvancedFilters;