'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { MenuItem } from '@/lib/supabase';

interface AdminPanelProps {
  items: MenuItem[];
  onAddItem: (item: Omit<MenuItem, 'id' | 'created_at'>) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export function AdminPanel({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: AdminPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
  });

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || !formData.price) {
      alert('Please fill all fields');
      return;
    }

    try {
      if (editingId) {
        await onUpdateItem(editingId, {
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
        });
        setEditingId(null);
      } else {
        await onAddItem({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          enabled: true,
        });
      }
      setFormData({ name: '', category: '', price: '' });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving item');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', category: '', price: '' });
  };

  const categories = Array.from(new Set(items.map(i => i.category))).sort();

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Menu Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto w-full text-sm sm:text-base h-10 sm:h-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Item Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Butter Chicken"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Category
                </label>
                <div className="flex gap-2 mb-2">
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant={formData.category === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={formData.category === cat ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Or enter new category"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Price (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {editingId ? 'Update' : 'Add'} Item
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No items yet. Add one to get started!</p>
        ) : (
          items.map(item => (
            <Card key={item.id} className="p-3 sm:p-4 bg-white dark:bg-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{item.name}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {item.category} • ₹{item.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {item.enabled ? 'Active' : 'Out of Stock'}
                    </span>
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) =>
                        onUpdateItem(item.id, { enabled: checked })
                      }
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditItem(item)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteItem(item.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
