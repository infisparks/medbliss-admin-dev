'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, Image, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface Banner {
  id: string
  image_url: string
  destination_page: string
  order_index: number
  updated_at: string
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [filteredBanners, setFilteredBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState({
    image_url: '',
    destination_page: '',
    order_index: ''
  })

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banner_data')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      
      setBanners(data || [])
      setFilteredBanners(data || [])
    } catch (error) {
      console.error('Error fetching banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = banners

    switch (filter) {
      case 'today':
        filtered = banners.filter(banner => 
          new Date(banner.updated_at).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = banners.filter(banner => new Date(banner.updated_at) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = banners.filter(banner => new Date(banner.updated_at) >= monthAgo)
        break
      default:
        filtered = banners
    }

    setFilteredBanners(filtered)
  }

  const handleSearch = (search: string) => {
    const filtered = banners.filter(banner =>
      banner.destination_page.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredBanners(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const bannerData = {
      image_url: formData.image_url,
      destination_page: formData.destination_page,
      order_index: parseInt(formData.order_index)
    }

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('banner_data')
          .update(bannerData)
          .eq('id', editingBanner.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('banner_data')
          .insert([bannerData])
        
        if (error) throw error
      }

      setIsDialogOpen(false)
      setEditingBanner(null)
      setFormData({
        image_url: '',
        destination_page: '',
        order_index: ''
      })
      fetchBanners()
    } catch (error) {
      console.error('Error saving banner:', error)
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      image_url: banner.image_url,
      destination_page: banner.destination_page,
      order_index: banner.order_index.toString()
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        const { error } = await supabase
          .from('banner_data')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchBanners()
      } catch (error) {
        console.error('Error deleting banner:', error)
      }
    }
  }

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const banner = banners.find(b => b.id === id)
    if (!banner) return

    const newOrderIndex = direction === 'up' ? banner.order_index - 1 : banner.order_index + 1
    
    try {
      const { error } = await supabase
        .from('banner_data')
        .update({ order_index: newOrderIndex })
        .eq('id', id)
      
      if (error) throw error
      fetchBanners()
    } catch (error) {
      console.error('Error reordering banner:', error)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Banner Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    placeholder="https://example.com/banner.jpg"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="destination_page">Destination Page</Label>
                  <Input
                    id="destination_page"
                    value={formData.destination_page}
                    onChange={(e) => setFormData({...formData, destination_page: e.target.value})}
                    placeholder="e.g., /packages, /services"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order_index">Order Index</Label>
                  <Input
                    id="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({...formData, order_index: e.target.value})}
                    placeholder="1, 2, 3..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingBanner ? 'Update Banner' : 'Create Banner'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <FilterBar onDateFilter={handleDateFilter} onSearch={handleSearch} />

        <Card>
          <CardHeader>
            <CardTitle>Banner List ({filteredBanners.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBanners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {banner.image_url ? (
                            <img 
                              src={banner.image_url} 
                              alt="Banner preview" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <ExternalLink className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">{banner.destination_page}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{banner.order_index}</span>
                        <div className="flex flex-col">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleReorder(banner.id, 'up')}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleReorder(banner.id, 'down')}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(banner.updated_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(banner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(banner.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}