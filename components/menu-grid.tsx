'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { MenuItem } from '@/lib/supabase';

interface MenuGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  isLoading?: boolean;
}

export function MenuGrid({ items, onSelectItem, isLoading = false }: MenuGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(
      items
        .filter((i) => i.enabled !== false)
        .map((i) => i.category)
    );
    return Array.from(cats).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.enabled === false) return false;
      if (selectedCategory && item.category !== selectedCategory) return false;
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [items, searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-slate-50 dark:bg-slate-900">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-800"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={selectedCategory === null ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          All
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Loading menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 sm:gap-3">
            {filteredItems.map(item => (
              <Card
                key={item.id}
                className="p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-shadow active:scale-95 min-h-24 sm:min-h-28 flex flex-col justify-center"
                onClick={() => onSelectItem(item)}
              >
                <div className="space-y-1">
                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 text-slate-900 dark:text-slate-100">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.category}</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600">₹{item.price.toFixed(2)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
